from app.kafka.config import KafkaConfig
from app.kafka.client import get_kafka_producer

class KafkaProducer:
    def __init__(self):
        self.config = KafkaConfig()
        self._producer = None

    async def _ensure_producer(self):
        if self._producer is None:
            self._producer = await get_kafka_producer(self.config)

    async def send_message(self, topic: str, value: bytes, key: bytes = None):
        await self._ensure_producer()
        return await self._producer.send_and_wait(topic, value, key=key)


    async def send_response(
        self,
        topic: str,
        correlation_id: str,
        payload: bytes,
    ):
        key = correlation_id.encode("utf-8")
        return await self.send_message(topic, payload, key=key)