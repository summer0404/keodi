from typing import List, Optional
from sentence_transformers import SentenceTransformer
from app.config.settings import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer(settings.embedding_model)

    def get_embedding(self, text: str) -> List[float]:
        try:
            return self.model.encode(text).tolist()
        except Exception as e:
            logger.error(f"Error when creating embedding '{text}': {e}")
            return []

_embedding_service: Optional[EmbeddingService] = None

def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service