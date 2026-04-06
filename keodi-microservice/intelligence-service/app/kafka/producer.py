import json

from aiokafka import AIOKafkaProducer
from app.kafka.config import KafkaConfig
from app.kafka.client import get_kafka_producer
from typing import Optional

class KafkaProducer:
    def __init__(self):
        self.config = KafkaConfig()
        self._producer: Optional[AIOKafkaProducer] = None

    async def _ensure_producer(self):
        if self._producer is None:
            self._producer = await get_kafka_producer()

    async def send_message(self, topic: str, value: bytes, key: bytes = None):
        await self._ensure_producer()
        return await self._producer.send_and_wait(topic, value=value, key=key)


    async def send_response(
        self,
        topic: str,
        kafka_correlationId: str,
        payload: str,
    ):
        await self._ensure_producer()
        return await self._producer.send(
            topic, 
            value=payload,  
            headers=[("kafka_correlationId", kafka_correlationId.encode("utf-8"))]
        )

    async def send_error_response(
        self,
        topic: str,
        kafka_correlationId: str,
        code: str,
        message: str,
    ):
        """Send a standardized error response compatible with NestJS microservices."""
        await self._ensure_producer()
        payload = json.dumps({"err": {"code": code, "message": message}, "response": None})
        return await self._producer.send(
            topic,
            value=payload,
            headers=[("kafka_correlationId", kafka_correlationId.encode("utf-8"))]
        )
    

__kafka_producer: Optional[KafkaProducer] = None

def get_producer () -> KafkaProducer:
    global __kafka_producer
    if __kafka_producer is None:
        __kafka_producer = KafkaProducer()
    return __kafka_producer