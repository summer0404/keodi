from dataclasses import dataclass
from typing import List

@dataclass
class Topics:
    EXTRACT_USER_INTENT: str = "intelligence.extract-user-intent"
    SENTIMENT_ANALYSIS: str = "intelligence.sentiment-analysis"
    USER_ACTION: str = "intelligence.user-action"

    EXTRACT_USER_INTENT_REPLY: str = "intelligence.extract-user-intent.reply"

    @classmethod
    def get_consuming_topics(cls) -> List[str]:
        return [
            cls.EXTRACT_USER_INTENT,
            cls.SENTIMENT_ANALYSIS,
            cls.USER_ACTION,
        ]
    
    @classmethod
    def get_reply_topics(cls) -> List[str]:
        return [
            cls.EXTRACT_USER_INTENT_REPLY,
        ]