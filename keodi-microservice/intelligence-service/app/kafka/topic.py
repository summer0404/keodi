from dataclasses import dataclass
from typing import List

@dataclass
class Topics:
    EXTRACT_USER_INTENT: str = "intelligence.extract-user-intent"
    SENTIMENT_ANALYSIS: str = "intelligence.sentiment-analysis"

    EXTRACT_USER_INTENT_REPLY: str = "intelligence.extract-user-intent.reply"
    SENTIMENT_ANALYSIS_REPLY: str = "intelligence.sentiment-analysis.reply"

    @classmethod
    def get_consuming_topics(cls) -> List[str]:
        return [
            cls.EXTRACT_USER_INTENT,
            cls.SENTIMENT_ANALYSIS
        ]
    
    @classmethod
    def get_reply_topics(cls) -> List[str]:
        return [
            cls.EXTRACT_USER_INTENT_REPLY,
            cls.SENTIMENT_ANALYSIS_REPLY
        ]