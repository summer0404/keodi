from contextlib import asynccontextmanager
from app.kafka.consumer import get_consumer_service
from fastapi import FastAPI
import asyncio 
from app.kafka.client import close_kafka_connections
from app.kafka.topic import Topics
from app.kafka.handler import get_handlers

@asynccontextmanager
async def lifespan(app: FastAPI):
    consumer_service = get_consumer_service()
    handlers = await get_handlers()

    consumer_service.register_handler(
        topic=Topics.EXTRACT_USER_INTENT,
        handler=handlers.extract_user_intent
    )

    consumer_service.register_handler(
        topic=Topics.SENTIMENT_ANALYSIS,
        handler=handlers.sentiment_analysis
    )

    consumer_service.register_handler(
        topic=Topics.USER_ACTION,
        handler=handlers.user_action
    )

    consumer_service.register_handler(
        topic=Topics.TRAIN_RANKING_MODEL,
        handler=handlers.train_ranking_model
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
    docs_url="/api/documents",
)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

    