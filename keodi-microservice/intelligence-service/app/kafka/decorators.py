import functools
import json
import logging
from app.kafka.producer import get_producer

logger = logging.getLogger(__name__)


def request_response(topic: str, error_code: str):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(self, message: dict, headers: dict):
            producer = get_producer()
            correlation_id = headers.get("kafka_correlationId", "")
            try:
                result = await func(self, message, headers)
                payload = json.dumps(result) if not isinstance(result, str) else result
                await producer.send_response(
                    topic=topic,
                    kafka_correlationId=correlation_id,
                    payload=payload,
                )
            except Exception as e:
                logger.exception("Handler '%s' failed", func.__name__)
                try:
                    await producer.send_error_response(
                        topic=topic,
                        kafka_correlationId=correlation_id,
                        code=error_code,
                        message=str(e),
                    )
                except Exception:
                    logger.exception("Failed to send error response for '%s'", func.__name__)

        return wrapper

    return decorator
