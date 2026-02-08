from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.kafka.consumer import get_consumer_service
import asyncio 
from app.kafka.client import close_kafka_connections
from app.kafka.topic import Topics

@asynccontextmanager
async def lifespan(app: FastAPI):
    consumer_service = get_consumer_service()

    consumer_service.register_handler(
        topic=Topics.EXTRACT_USER_INTENT
        # add hanlder
    )

    consumer_service.register_handler(
        topic=Topics.SENTIMENT_ANALYSIS
        # add hanlder
    )

    asyncio.create_task(consumer_service.start(
        topics=Topics.get_consuming_topics()
    ))

    yield

    await consumer_service.stop()
    await close_kafka_connections()

app = FastAPI(
    lifespan=lifespan,
    title="Intelligence Service",
)




    