

from typing import Callable, Dict


class MessageRouter:
    def __init__(self):
        self.handlers: Dict[str, Callable] = {}

    def register(self, topic: str, handler: Callable):

        self.handlers[topic] = handler

    async def route(self, topic: str, message: dict, headers: dict = None):
        handler = self.handlers.get(topic)

        if handler is None:
            raise ValueError(f"No handler registered for topic: {topic}")
        
        try:
            await handler(message, headers or {})
        except Exception as e:
            raise RuntimeError(f"Error processing message for topic {topic}: {e}") from e