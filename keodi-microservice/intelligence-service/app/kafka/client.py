

from typing import Optional
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from app.kafka.config import KafkaConfig


_producer: Optional[AIOKafkaProducer] = None
_consumer: Optional[AIOKafkaConsumer] = None

config = KafkaConfig()

async def get_kafka_producer() -> AIOKafkaProducer:
    global _producer
    if _producer is None:
        config = KafkaConfig()
        _producer = AIOKafkaProducer(
            **config.get_producer_config(),
            value_serializer=lambda v: v.encode('utf-8') if v else None
        )
        await _producer.start()
    return _producer

async def get_kafka_consumer(topics: list[str]) -> AIOKafkaConsumer:
    global _consumer
    if _consumer is None:
        config = KafkaConfig()
        _consumer = AIOKafkaConsumer(
            *topics,
            **config.get_consumer_config(),
            value_deserializer=lambda v: v.decode('utf-8') if v else None
        )
        await _consumer.start()
    return _consumer

async def close_kafka_connections():
    global _producer, _consumer
    if _producer is not None:
        await _producer.stop()
        _producer = None
    if _consumer is not None:
        await _consumer.stop()
        _consumer = None