import json
import logging
import math
import asyncio
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
from typing import Optional
from app.kafka.consumer import KafkaConsumerService, get_consumer_service
from app.services.llm.llm_service import LLMService, get_llm_service
from app.services.embedding.embedding_service import EmbeddingService, get_embedding_service
from app.services.ranking.ranking_service import RankingService, get_ranking_service
from app.kafka.topic import Topics
from app.kafka.decorators import request_response
from app.repositories.place_repository import PlaceRepository
from app.repositories.attribute_repository import AttributeRepository
from app.repositories.place_attribute_repository import PlaceAttributeRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.user_attribute_repository import UserAttributeRepository
from app.repositories.user_action_repository import UserActionRepository
from app.repositories.user_repository import UserRepository
from app.repositories.user_category_repository import UserCategoryRepository
from app.repositories.place_category_repository import PlaceCategoryRepository
from app.common.constant import SMOOTHING_FACTOR, TIME_DECAY, UPDATE_USER_ATTRIBUTE_SCORE_THRESHOLD, ACTION_WEIGHTS
from app.common.helper import clip

class Handlers:
    consumer_service: Optional[KafkaConsumerService] = None
    llm_service: Optional[LLMService] = None
    embedding_service: Optional[EmbeddingService] = None
    ranking_service: Optional[RankingService] = None
    place_repository: Optional[PlaceRepository] = None
    attribute_repository: Optional[AttributeRepository] = None
    place_attribute_repository: Optional[PlaceAttributeRepository] = None
    review_repository: Optional[ReviewRepository] = None
    user_attribute_repository: Optional[UserAttributeRepository] = None
    user_action_repository: Optional[UserActionRepository] = None
    user_repository: Optional[UserRepository] = None
    user_category_repository: Optional[UserCategoryRepository] = None
    place_category_repository: Optional[PlaceCategoryRepository] = None


    def __init__(self):
        self.consumer_service = get_consumer_service()
        
    async def start(self):
        self.llm_service = await get_llm_service()
        self.embedding_service = get_embedding_service()
        self.ranking_service = await get_ranking_service()
        self.place_repository = await PlaceRepository.start()
        self.attribute_repository = await AttributeRepository.start()
        self.place_attribute_repository = await PlaceAttributeRepository.start()
        self.review_repository = await ReviewRepository.start()
        self.user_attribute_repository = await UserAttributeRepository.start()
        self.user_action_repository = await UserActionRepository.start()
        self.user_repository = await UserRepository.start()
        self.user_category_repository = await UserCategoryRepository.start()
        self.place_category_repository = await PlaceCategoryRepository.start()
        return self

    def calculate_delta_time(self, last_updated) -> float:
        if last_updated is None:
            return 0.0

        now = datetime.now(timezone.utc)
    
        if isinstance(last_updated, str):
            last_updated = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
        else:
            last_updated = last_updated

        delta = now - last_updated
        
        delta_days = delta.total_seconds() / (24 * 3600)
        
        return max(0.0, delta_days)
    
    def _calculate_place_attribute_score(self, current_score: float, new_score: float, review_count: int) -> float:
        learning_rate = 1 / (SMOOTHING_FACTOR + review_count + 1)
        return current_score + learning_rate * (new_score - current_score)
    

    def _calculate_user_attribute_score(self, current_score: float, place_current_score: float, action: str, last_updated: datetime) -> float:
        delta_t = self.calculate_delta_time(last_updated)
        decay = math.exp(-TIME_DECAY * delta_t)

        contribution = ACTION_WEIGHTS.get(action, 0) * place_current_score

        return current_score * decay + contribution

    @request_response(topic=Topics.EXTRACT_USER_INTENT_REPLY, error_code="EMBEDDING_FAILED")
    async def extract_user_intent(self, message: dict, headers: dict):
        search = message.get("search", "")

        async def _embed():
            return await asyncio.to_thread(self.embedding_service.get_embedding, search)

        async def _extract_keyword():
            try:
                return (await self.llm_service.extract_user_intent(search=search)).strip()
            except Exception as e:
                logger.exception("LLM extract_user_intent failed: %s", e)
                return None

        embedding, keyword = await asyncio.gather(_embed(), _extract_keyword())

        return {
            "keywords": keyword,
            "embedding": embedding,
        }

    
    async def sentiment_analysis(self, message: dict, headers: dict):
        text = message.get("text", "")
        place_id = message.get("placeId", "")
        review_id = message.get("reviewId", "")

        try:
            sentiment_attributes = await self.llm_service.sentiment_analysis(review=text)

            if isinstance(sentiment_attributes, str):
                attributes_dict = json.loads(sentiment_attributes)
            else:
                attributes_dict = sentiment_attributes
            
            for attribute_name, score in attributes_dict.items():

                attribute = await self.attribute_repository.get_attribute_by_name(attribute_name)

                if not attribute:
                    continue
                
                place_attribute = await self.place_attribute_repository.get_place_attribute_by_id(place_id, attribute.id)
                
                review_count = 0

                if place_attribute:
                    review_count = place_attribute.reviewCount
                    new_score = self._calculate_place_attribute_score(place_attribute.score, score, place_attribute.reviewCount)
                else:
                    new_score = self._calculate_place_attribute_score(0, score, review_count)
                
                await self.place_repository.update_attributes(place_id, attribute.id, new_score, review_count)

                await self.review_repository.mark_review_as_analyzed(review_id)
                
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to update place attributes: {str(e)}")


    async def user_action(self, message: dict, headers: dict):
        user_id = message.get("userId", "")
        place_id = message.get("placeId", "")
        action = message.get("action", "")

        try:
            existing_user = await self.user_repository.get_by_id(user_id)
            if not existing_user:
                logger.warning("user_action skipped: User not found: %s", user_id)
                return

            existing_place = await self.place_repository.get_by_id(place_id)
            if not existing_place:
                logger.warning("user_action skipped: Place not found: %s", place_id)
                return

            await self.user_action_repository.create_user_action(user_id, place_id, action)

            # Update attribute
            place_attributes = await self.place_attribute_repository.get_place_attiributes_by_place_id_and_threshold(place_id, UPDATE_USER_ATTRIBUTE_SCORE_THRESHOLD)

            for place_attribute in place_attributes:
                user_attribute = await self.user_attribute_repository.get_user_attribute_by_id(user_id, place_attribute.attributeId)
                new_score = clip(self._calculate_user_attribute_score(user_attribute.score if user_attribute else 0, place_attribute.score, action, user_attribute.updatedAt if user_attribute else None), -1, 1)

                await self.user_attribute_repository.update_user_attribute(user_id, place_attribute.attributeId, new_score)

            # Update category
            place_categories = await self.place_category_repository.get_place_categories_by_place_id(place_id)
            for place_category in place_categories:
                await self.user_category_repository.update_user_category(user_id, place_category.categoryId)
        except Exception as e:
            raise Exception(f"Failed to process user action: {str(e)}")
        
    async def train_ranking_model(self, message: dict, headers: dict):
        try:
            df = await self.ranking_service._prepare_training_data()

            await asyncio.to_thread(self.ranking_service._run_lightgbm_training, df)
        except Exception as e:
            raise Exception(f"Failed to train ranking model: {str(e)}")
        
    @request_response(topic=Topics.RANKING_REPLY, error_code="RANKING_FAILED")
    async def ranking(self, message: dict, headers: dict):
        user_id = message.get("userId", "")
        place_ids = message.get("placeIds", [])
        try:
            return await self.ranking_service.ranking(user_id, place_ids)
        except Exception as e:
            raise Exception(f"Failed to get ranking: {str(e)}")


handlers: Optional[Handlers] = None

async def get_handlers() -> Handlers:
    global handlers
    if handlers is None:
        handlers = await Handlers().start()
    return handlers

