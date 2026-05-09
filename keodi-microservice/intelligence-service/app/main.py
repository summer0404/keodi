from contextlib import asynccontextmanager

import asyncio
from fastapi import FastAPI

from app.kafka.client import close_kafka_connections
from app.kafka.consumer import get_consumer_service
from app.kafka.handler import get_handlers
from app.kafka.topic import Topics

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

    consumer_service.register_handler(
        topic=Topics.RANKING,
        handler=handlers.ranking
    )

    consumer_service.register_handler(
        topic=Topics.AGENT_SEARCH,
        handler=handlers.agent_search
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
