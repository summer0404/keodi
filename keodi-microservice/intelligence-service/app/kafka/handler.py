from typing import Optional
from app.kafka.producer import KafkaProducer, get_producer
from app.kafka.consumer import KafkaConsumerService, get_consumer_service
from app.services.llm.llm_service import LLMService, get_llm_service
from app.kafka.topic import Topics
from app.repositories.place_repository import PlaceRepository

class Handlers:
    producer: Optional[KafkaProducer] = None
    consumer_service: Optional[KafkaConsumerService] = None
    llm_service: Optional[LLMService] = None
    place_repository: Optional[PlaceRepository] = None


    def __init__(self):
        self.producer = get_producer()
        self.consumer_service = get_consumer_service()
        
    async def start(self):
        self.llm_service = await get_llm_service()
        self.place_repository = await PlaceRepository.start()
        return self


    async def extract_user_intent(self, message: dict, headers: dict):
        search = message.get("search", "")
        correlation_id = headers.get("correlation_id", "")
        intent = await self.llm_service.extract_user_intent(search=search)
        return self.producer.send_response(
            topic=Topics.EXTRACT_USER_INTENT_REPLY,
            correlation_id=correlation_id,
            payload=intent.encode("utf-8"),
        )
    
    async def sentiment_analysis(self, message: dict, headers: dict):
        text = message.get("text", "")
        place_id = message.get("placeId", "")

        sentiment_attributes = await self.llm_service.sentiment_analysis(review=text)

        return await self.place_repository.update_attributes(
            place_id=place_id,
            sentiment_attributes=sentiment_attributes
        )
    

handlers: Optional[Handlers] = None

async def get_handlers() -> Handlers:
    global handlers
    if handlers is None:
        handlers = await Handlers().start()
    return handlers

