from dataclasses import dataclass
from typing import List

@dataclass
class Topics:
    EXTRACT_USER_INTENT: str = "intelligence.extract-user-intent"
    SENTIMENT_ANALYSIS: str = "intelligence.sentiment-analysis"
    USER_ACTION: str = "intelligence.user-action"
    TRAIN_RANKING_MODEL: str = "intelligence.train-ranking-model"
    RANKING: str = "intelligence.ranking"

    EXTRACT_USER_INTENT_REPLY: str = "intelligence.extract-user-intent.reply"
    RANKING_REPLY: str = "intelligence.ranking.reply"

    @classmethod
    def get_consuming_topics(cls) -> List[str]:
        return [
            cls.EXTRACT_USER_INTENT,
            cls.SENTIMENT_ANALYSIS,
            cls.USER_ACTION,
            cls.TRAIN_RANKING_MODEL,
            cls.RANKING,
        ]
    
    @classmethod
    def get_reply_topics(cls) -> List[str]:
        return [
            cls.EXTRACT_USER_INTENT_REPLY,
            cls.RANKING_REPLY,
        ]