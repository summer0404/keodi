from typing import Optional, Dict
import json
from app.config.settings import get_settings
from app.prompts.prompt import Prompts
from app.services.llm.base_provider import BaseLLMProvider
from app.services.llm.groq_provider import GroqProvider
from app.services.llm.modal_provider import ModalProvider
from app.services.embedding.embedding_service import get_embedding_service
from app.repositories.attribute_repository import AttributeRepository

settings = get_settings()

class LLMService:
    def __init__(self):
        self.mode = settings.llm_deployment_mode
        self.providers: Dict[str, BaseLLMProvider] = {}

        self.prompts = Prompts()

        self.embedding_service = get_embedding_service()
        self.attribute_repository: Optional[AttributeRepository] = None

        self._init_providers()

    async def start(self):
        self.attribute_repository = await AttributeRepository.start()
        return self

    def _init_providers(self):
        if self.mode == "groq":
            if settings.groq_api_key:
                self.providers["groq"] = GroqProvider()

        if self.mode == "modal":
            if settings.modal_endpoint:
                self.providers["modal"] = ModalProvider()

        if not self.providers:
            raise ValueError(f"No LLM provider available for mode: {self.mode}")
        
    async def extract_user_intent(
        self,
        search: str,
        **kwargs
    ) -> str:
        provider = self.providers.get(self.mode)

        if not provider:
            raise ValueError(f"Provider not available: {self.mode}")

        max_retries = settings.llm_max_retries
        last_error = None

        prompt = self.prompts.EXTRACT_USER_INTENT.format(search=search)
        

        for attempt in range(max_retries):
            try:
                result = await provider.generate(
                    prompt=prompt,
                    **kwargs
                )
                return result
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    continue
                continue

        raise Exception(f"LLM generation failed after {max_retries} retries: {last_error}")
    
    async def sentiment_analysis(
        self,
        review: str,
        **kwargs
    ) -> str:
        provider = self.providers.get(self.mode)

        if not provider:
            raise ValueError(f"Provider not available: {self.mode}")

        max_retries = settings.llm_max_retries
        last_error = None
        
        attributes = await self.attribute_repository.get_all_attributes()

        attributes_list = [attr.name for attr in attributes] if attributes else []

        prompt = self.prompts.SENTIMENT_ANALYSIS.format(
            review=review,
            attributes=json.dumps(attributes_list)
        )

        for attempt in range(max_retries):
            try:
                result = await provider.generate(
                    prompt=prompt,
                    **kwargs
                )
                return result
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    continue
                continue

        raise Exception(f"LLM generation failed after {max_retries} retries: {last_error}")


# Singleton instance
_llm_service: Optional[LLMService] = None

async def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = await LLMService().start()
    return _llm_service
