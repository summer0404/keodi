from datetime import datetime, timezone
import math

import lightgbm as lgb
from typing import Optional
import pandas as pd
from app.config.settings import get_settings
from app.common.constant import TIME_DECAY, MIN_OVERLAP_THRESHOLD
from app.repositories.base_repository import BaseRepository

settings = get_settings()

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

    def _prepare_training_data(self) -> pd.DataFrame:
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
        records = self.base_repository.db.query_raw(query)
        
        df_actions = pd.DataFrame([dict(record) for record in records])
        
        user_attributes = self.base_repository.db.userattribute.find_many(
            where={"userId": {"in": df_actions['user_id'].to_list()}}
        )
        
        place_attributes = self.base_repository.db.placeattribute.find_many(
            where={"placeId": {"in": df_actions['place_id'].to_list()}}
        )
        
        now = datetime.now(timezone.utc)
        
        user_attribute_dict = {}
        for user_attribute in user_attributes:
            if user_attribute.userId not in user_attribute_dict:
                user_attribute_dict[user_attribute.userId] = {}
            
            user_attribute_dict[user_attribute.userId][user_attribute.attributeId] = self.calculate_decay_score(
                user_attribute.value,
                now,
                user_attribute.updatedAt
            )
            
        place_attributes_dict = {}
        for place_attribute in place_attributes:
            if place_attribute.placeId not in place_attributes_dict:
                place_attributes_dict[place_attribute.placeId] = {}
            
            place_attributes_dict[place_attribute.placeId][place_attribute.attributeId] = place_attribute.score
            
        feature_rows = []
        for _, row in df_actions.iterrows():
            user_id = row['user_id']
            place_id = row['place_id']
            label = row['label']
            
            user_attrs = user_attribute_dict.get(user_id, {})
            place_attrs = place_attributes_dict.get(place_id, {})
            
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

    def _run_lightgbm_training_async(self, df: pd.DataFrame):
        x = df[['cosine_sim', 'max_match', 'dealbreaker', 'overlap_count']]
        y = df['label']
        
        params = {
            'objective': settings.ltr_objective,
            'metric': settings.ltr_metric,
            'boosting_type': settings.ltr_boosting_type,
            'num_leaves': settings.ltr_num_leaves,
            'learning_rate': settings.ltr_learning_rate,
            'feature_fraction': settings.ltr_feature_fraction
        }
        
        training_data = lgb.Dataset(x, label=y)
        
        self.model = lgb.train(params, training_data, num_boost_round=100)

        self.model.save_model(settings.ltr_model_path)



_ranking_service: Optional[RankingService] = None

async def get_ranking_service() -> RankingService:
    global _ranking_service
    if _ranking_service is None:
        _ranking_service = await RankingService().start()
    return _ranking_service