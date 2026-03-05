import json
from typing import Optional
from app.kafka.producer import KafkaProducer, get_producer
from app.kafka.consumer import KafkaConsumerService, get_consumer_service
from app.services.llm.llm_service import LLMService, get_llm_service
from app.kafka.topic import Topics
from app.repositories.place_repository import PlaceRepository
from app.repositories.attribute_repository import AttributeRepository
from app.repositories.place_attribute_repository import PlaceAttributeRepository
from app.repositories.review_repository import ReviewRepository

class Handlers:
    SMOOTHING_FACTOR = 5

    producer: Optional[KafkaProducer] = None
    consumer_service: Optional[KafkaConsumerService] = None
    llm_service: Optional[LLMService] = None
    place_repository: Optional[PlaceRepository] = None
    attribute_repository: Optional[AttributeRepository] = None
    place_attribute_repository: Optional[PlaceAttributeRepository] = None
    review_repository: Optional[ReviewRepository] = None


    def __init__(self):
        self.producer = get_producer()
        self.consumer_service = get_consumer_service()

    def _calculate_score(self, current_score: float, new_score: float, review_count: int) -> float:
        learning_rate = 1 / (self.SMOOTHING_FACTOR + review_count + 1)
        return current_score + learning_rate * (new_score - current_score)
        
    async def start(self):
        self.llm_service = await get_llm_service()
        self.place_repository = await PlaceRepository.start()
        self.attribute_repository = await AttributeRepository.start()
        self.place_attribute_repository = await PlaceAttributeRepository.start()
        self.review_repository = await ReviewRepository.start()
        return self


    async def extract_user_intent(self, message: dict, headers: dict):
        search = message.get("search", "")
        kafka_correlationId = headers.get("kafka_correlationId", "")
        intent = await self.llm_service.extract_user_intent(search=search)
        return await self.producer.send_response(
            topic=Topics.EXTRACT_USER_INTENT_REPLY,
            kafka_correlationId=kafka_correlationId,
            payload=intent,
        )
    
    async def sentiment_analysis(self, message: dict, headers: dict):
        text = message.get("text", "")
        place_id = message.get("placeId", "")
        review_id = message.get("reviewId", "")

        sentiment_attributes = await self.llm_service.sentiment_analysis(review=text)

        try:
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
                    new_score = self._calculate_score(place_attribute.score, score, place_attribute.reviewCount)
                else:
                    new_score = self._calculate_score(0, score, review_count)
                
                await self.place_repository.update_attributes(place_id, attribute.id, new_score, review_count)

                await self.review_repository.mark_review_as_analyzed(review_id)
                
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to update place attributes: {str(e)}")

handlers: Optional[Handlers] = None

async def get_handlers() -> Handlers:
    global handlers
    if handlers is None:
        handlers = await Handlers().start()
    return handlers

