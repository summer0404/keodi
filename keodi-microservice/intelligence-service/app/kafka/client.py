

from typing import Optional
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
from app.kafka.config import KafkaConfig


_producer: Optional[AIOKafkaProducer] = None
_consumer: Optional[AIOKafkaConsumer] = None

config = KafkaConfig()

async def get_kafka_producer(self,config: Optional[KafkaConfig]) -> AIOKafkaProducer:
    global _producer
    if _producer is None:
        _producer = AIOKafkaProducer(
            **(self.config.get_producer_config())
        )
        await _producer.start()
    return _producer

async def get_kafka_consumer(self,config: Optional[KafkaConfig]) -> AIOKafkaConsumer:
    global _consumer
    if _consumer is None:
        _consumer = AIOKafkaConsumer(
            **(self.config.get_consumer_config())
        )
        await _consumer.start()
    return _consumer