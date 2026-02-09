from typing import Optional
from app.kafka.producer import KafkaProducer, get_producer
from app.kafka.consumer import KafkaConsumerService, get_consumer_service
from app.services.llm.llm_service import LLMService, get_llm_service
from app.kafka.topic import Topics

class Handlers:
    producer: Optional[KafkaProducer] = None
    consumer_service: Optional[KafkaConsumerService] = None
    llm_service: Optional[LLMService] = None


    def __init__(self):
        self.producer = get_producer()
        self.consumer_service = get_consumer_service()
        
    async def start(self):
        self.llm_service = await get_llm_service()
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
        correlation_id = headers.get("correlation_id", "")
        sentiment = await self.llm_service.sentiment_analysis(review=text)
        return self.producer.send_response(
            topic=Topics.SENTIMENT_ANALYSIS_REPLY,
            correlation_id=correlation_id,
            payload=sentiment.encode("utf-8"),
        )
    

hanlders: Optional[Handlers] = None

async def get_handlers() -> Handlers:
    global hanlders
    if hanlders is None:
        hanlders = await Handlers().start()
    return hanlders

