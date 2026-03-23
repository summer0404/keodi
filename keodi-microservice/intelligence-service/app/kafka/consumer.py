from typing import Callable, Optional
from app.kafka.config import KafkaConfig
from app.kafka.client import get_kafka_consumer
from app.kafka.router import MessageRouter
from aiokafka import AIOKafkaConsumer
import json
import logging

logger = logging.getLogger(__name__)

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

                await self._process_message(msg)

        except Exception as e:
            raise RuntimeError(f"Error in Kafka consumer: {e}") from e
        finally:
            await self.stop()

    async def _process_message(self, msg):
        try:
            value = msg.value
            if isinstance(value, bytes):
                value = value.decode("utf-8")
            data = json.loads(value)

            headers = {}
            if msg.headers:
                for key, value in msg.headers:
                    if isinstance(key, bytes):
                        key = key.decode("utf-8")
                    if isinstance(value, bytes):
                        value = value.decode("utf-8")
                    headers[key] = value

            await self.router.route(msg.topic, data, headers)
        except Exception as e:
            logger.error("Skipping message from topic %s: %s", msg.topic, e)
        
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