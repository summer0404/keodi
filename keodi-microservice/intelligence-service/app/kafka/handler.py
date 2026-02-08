from typing import Optional
from app.kafka.producer import KafkaProducer, get_producer
from app.kafka.consumer import KafkaConsumerService, get_consumer_service

class Handlers:
    producer: Optional[KafkaProducer] = None
    consumer_service: Optional[KafkaConsumerService] = None

    def __init__(self):
        self.producer = get_producer()
        self.consumer_service = get_consumer_service()

    async def extract_user_intent(self, message: dict):
        pass
        

