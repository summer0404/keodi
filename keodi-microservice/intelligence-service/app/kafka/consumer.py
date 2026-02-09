from typing import Callable, Optional
from app.kafka.config import KafkaConfig
from app.kafka.client import get_kafka_consumer
from app.kafka.router import MessageRouter
from aiokafka import AIOKafkaConsumer
import json

class KafkaConsumerService:
    def __init__(self):
        self.config = KafkaConfig()
        self.router = MessageRouter()
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.running = False

    def register_handler(self, topic: str, handler: Callable):
        self.router.register(topic, handler)
    
    async def start(self, topics: list[str]):
        self.consumer = await get_kafka_consumer(topics)
        self.running = True

        try:
            async for msg in self.consumer:
                if not self.running:
                    break

                await self._process_message(msg.topic, msg.value)

        except Exception as e:
            raise RuntimeError(f"Error in Kafka consumer: {e}") from e
        finally:
            await self.stop()

    async def _process_message(self, topic: str, value):
        try:
            if isinstance(value, bytes):
                value = value.decode("utf-8")

            data = json.loads(value)

            await self.router.route(topic, data)
        except Exception as e:
            raise RuntimeError(f"Error routing message from topic {topic}: {e}") from e
        
    async def stop(self):
        self.running = False
        if self.consumer:
            await self.consumer.stop()
            self.consumer = None


_consumer_service: Optional[KafkaConsumerService] = None

def get_consumer_service() -> KafkaConsumerService:
    global _consumer_service
    if _consumer_service is None:
        _consumer_service = KafkaConsumerService()
    return _consumer_service