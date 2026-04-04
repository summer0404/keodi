from datetime import datetime, timezone
import math
import logging
import asyncio
import random

import lightgbm as lgb
from typing import Optional
import pandas as pd
from app.config.settings import get_settings
from app.common.constant import TIME_DECAY, MIN_OVERLAP_THRESHOLD
from app.repositories.base_repository import BaseRepository

settings = get_settings()
logger = logging.getLogger(__name__)

class RankingService:
    base_repository: Optional[BaseRepository] = None
    model: Optional[lgb.Booster] = None
    
    async def start(self):
        self.base_repository = await BaseRepository.start()
        
        try:
            self.model = lgb.Booster(model_file=settings.ltr_model_path)
        except Exception as e:
            self.model = None
        return self
    
    def calculate_decay_score(self, score, now, last_updated) -> float:
        delta_day = (now - last_updated).total_seconds() / (3600 * 24)
        return score * math.exp(-TIME_DECAY * delta_day)

    def _extract_features(self, user_attrs: dict, place_attrs: dict) -> tuple:
        cosine_sim = 0.0
        max_match = 0.0
        dealbreaker = 0.0
        overlap_count = 0
        
        if user_attrs and place_attrs:
            dot_product = 0.0
            user_normal_sq = 0.0
            place_normal_sq = 0.0
            element_wise_products = []
            
            all_attrs = set(user_attrs.keys()).union(set(place_attrs.keys()))
            
            for attr in all_attrs:
                u_val = user_attrs.get(attr, 0.0)
                p_val = place_attrs.get(attr, 0.0)
                
                user_normal_sq += u_val ** 2
                place_normal_sq += p_val ** 2
                
                if u_val != 0 and p_val != 0:
                    prod = u_val * p_val
                    dot_product += prod
                    element_wise_products.append(prod)
                    
                    if u_val > MIN_OVERLAP_THRESHOLD and p_val > MIN_OVERLAP_THRESHOLD:
                        overlap_count += 1
                        
            if user_normal_sq > 0 and place_normal_sq > 0:
                cosine_sim = dot_product / (math.sqrt(user_normal_sq) * math.sqrt(place_normal_sq))
                
            if element_wise_products:
                max_match = max(element_wise_products)
                dealbreaker = min(element_wise_products)
                
        return cosine_sim, max_match, dealbreaker, overlap_count

    async def _prepare_training_data(self) -> pd.DataFrame:
        query = """
            SELECT
                ua.user_id,
                ua.place_id,
                MAX(
                    CASE ua.action::text
                        WHEN 'GET_DIRECTION' THEN 5
                        WHEN 'RATE_5' THEN 5
                        WHEN 'RATE_4' THEN 4
                        WHEN 'FAVORITE' THEN 4
                        WHEN 'RATE_3' THEN 2
                        WHEN 'READ_REVIEWS' THEN 2
                        WHEN 'CLICK' THEN 2
                        WHEN 'RATE_2' THEN 0
                        WHEN 'RATE_1' THEN 0
                        ELSE 1
                    END
                ) AS label
            FROM user_actions ua
            GROUP BY ua.user_id, ua.place_id
        """
        records = await self.base_repository.db.query_raw(query)
        df_actions = pd.DataFrame([dict(record) for record in records])
        
        if df_actions.empty:
            return pd.DataFrame()
        
        unique_users = df_actions['user_id'].unique()
        unique_places = df_actions['place_id'].unique()
        
        positive_pairs = set(zip(df_actions['user_id'], df_actions['place_id']))
        negative_rows = []
        
        NUM_NEGATIVES_PER_USER = min(5, len(unique_places)) 
        
        for u in unique_users:
            sampled_places = random.choices(unique_places, k=NUM_NEGATIVES_PER_USER)
            
            for p in sampled_places:
                if (u, p) not in positive_pairs:
                    negative_rows.append({
                        "user_id": u, 
                        "place_id": p, 
                        "label": 0  
                    })
                    positive_pairs.add((u, p))
                    
        df_negatives = pd.DataFrame(negative_rows)
        
        df_all = pd.concat([df_actions, df_negatives], ignore_index=True)
        
        logger.info(f"Đã tạo {len(df_actions)} positive samples và {len(df_negatives)} negative samples.")

        user_attributes = await self.base_repository.db.userattribute.find_many(
            where={"userId": {"in": df_all['user_id'].to_list()}}
        )
        
        place_attributes = await self.base_repository.db.placeattribute.find_many(
            where={"placeId": {"in": df_all['place_id'].to_list()}}
        )
        
        now = datetime.now(timezone.utc)
        
        user_attribute_dict = {}
        for user_attribute in user_attributes:
            if user_attribute.userId not in user_attribute_dict:
                user_attribute_dict[user_attribute.userId] = {}
            
            user_attribute_dict[user_attribute.userId][user_attribute.attributeId] = self.calculate_decay_score(
                user_attribute.score,
                now,
                user_attribute.updatedAt
            )
            
        place_attributes_dict = {}
        for place_attribute in place_attributes:
            if place_attribute.placeId not in place_attributes_dict:
                place_attributes_dict[place_attribute.placeId] = {}
            place_attributes_dict[place_attribute.placeId][place_attribute.attributeId] = place_attribute.score
            
        feature_rows = []
        
        # DUYỆT QUA df_all (Bao gồm cả dòng thật và dòng mẫu âm)
        for _, row in df_all.iterrows():
            user_id = row['user_id']
            place_id = row['place_id']
            label = row['label']
            
            user_attrs = user_attribute_dict.get(user_id, {})
            place_attrs = place_attributes_dict.get(place_id, {})
            
            cosine_sim, max_match, dealbreaker, overlap_count = self._extract_features(user_attrs, place_attrs)
                    
            feature_rows.append({
                "user_id": user_id,
                "place_id": place_id,
                "label": label,
                "cosine_sim": cosine_sim,
                "max_match": max_match,
                "dealbreaker": dealbreaker,
                "overlap_count": overlap_count,
            })
            
        return pd.DataFrame(feature_rows)

    def _run_lightgbm_training(self, df: pd.DataFrame):
        if df.empty:
            logger.warning("Training data is empty. Skipping model training.")
            return
        
        df = df.sort_values('user_id').reset_index(drop=True)
        
        x = df[['cosine_sim', 'max_match', 'dealbreaker', 'overlap_count']]
        y = df['label']
        
        group = df.groupby('user_id', sort=False).size().to_list()
        
        params = {
            'objective': settings.ltr_objective,
            'metric': settings.ltr_metric,
            'boosting_type': settings.ltr_boosting_type,
            'num_leaves': settings.ltr_num_leaves,
            'learning_rate': settings.ltr_learning_rate,
            'feature_fraction': settings.ltr_feature_fraction,
            'verbose': -1
        }
        
        if len(df) < 100:
            params['min_data_in_leaf'] = 1
            params['min_data_in_bin'] = 1
            
        training_data = lgb.Dataset(x, label=y, group=group)
        
        self.model = lgb.train(params, training_data, num_boost_round=100)
        self.model.save_model(settings.ltr_model_path)
        logger.info(f"Model saved successfully to {settings.ltr_model_path}")

    async def ranking(self, user_id: str, place_ids: list[str]) -> list[dict]:
        if not self.model or not place_ids:
            return [{"place_id": pid, "ai_score": 0.0} for pid in place_ids]

        user_attributes = await self.base_repository.db.userattribute.find_many(
            where={"userId": user_id}
        )
        
        place_attributes = await self.base_repository.db.placeattribute.find_many(
            where={"placeId": {"in": place_ids}}
        )

        now = datetime.now(timezone.utc)
        
        user_attrs = {
            ua.attributeId: self.calculate_decay_score(ua.score, now, ua.updatedAt)
            for ua in user_attributes
        }

        place_attrs_dict = {pid: {} for pid in place_ids}
        for pa in place_attributes:
            place_attrs_dict[pa.placeId][pa.attributeId] = pa.score

        feature_rows = []
        for pid in place_ids:
            p_attrs = place_attrs_dict.get(pid, {})
            
            features = self._extract_features(user_attrs, p_attrs)
            feature_rows.append(features)

        def _predict_sync(features_list):
            df_predict = pd.DataFrame(
                features_list, 
                columns=['cosine_sim', 'max_match', 'dealbreaker', 'overlap_count']
            )
            return self.model.predict(df_predict)

        scores = await asyncio.to_thread(_predict_sync, feature_rows)

        results = [
            {"place_id": pid, "ranking_score": float(score)}
            for pid, score in zip(place_ids, scores)
        ]
        
        results.sort(key=lambda x: x["ranking_score"], reverse=True)
        return results



_ranking_service: Optional[RankingService] = None

async def get_ranking_service() -> RankingService:
    global _ranking_service
    if _ranking_service is None:
        _ranking_service = await RankingService().start()
    return _ranking_service