"""
LLM Service - Unified interface for multiple LLM providers
Supports: Groq (free), Modal (QWen GPU), Ollama (local)
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import httpx
import json
from app.config.settings import get_settings

settings = get_settings()


class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> str:
        pass


class GroqProvider(BaseLLMProvider):
    def __init__(self):
        try:
            from groq import AsyncGroq
            self.client = AsyncGroq(api_key=settings.groq_api_key)
            self.model = settings.groq_model
        except ImportError:
            raise ImportError("Please install groq: pip install groq")

    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> str:
        temperature = settings.groq_temperature
        max_tokens = settings.groq_max_tokens

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Groq API error: {str(e)}")


# LATER IMPLMENT ModalProvider IF NEEDED
# class ModalProvider(BaseLLMProvider):
#     """Modal.com Provider (QWen 2.5-7B on GPU)"""

#     def __init__(self):
#         self.endpoint = settings.modal_endpoint
#         self.api_token = settings.modal_api_token

#         if not self.endpoint:
#             raise ValueError("MODAL_ENDPOINT not configured in .env")

#     async def generate(
#         self,
#         prompt: str,
#         temperature: float = 0.1,
#         max_tokens: int = 512,
#         **kwargs
#     ) -> str:
#         """Generate text using Modal endpoint"""
#         headers = {}
#         if self.api_token:
#             headers["Authorization"] = f"Bearer {self.api_token}"

#         payload = {
#             "prompt": prompt,
#             "temperature": temperature,
#             "max_tokens": max_tokens,
#             **kwargs
#         }

#         try:
#             async with httpx.AsyncClient(timeout=60.0) as client:
#                 response = await client.post(
#                     self.endpoint,
#                     json=payload,
#                     headers=headers
#                 )
#                 response.raise_for_status()
#                 result = response.json()
#                 return result.get("result") or result.get("text")
#         except httpx.HTTPError as e:
#             raise Exception(f"Modal API error: {str(e)}")


class LLMService:
    def __init__(self):
        self.mode = settings.llm_deployment_mode
        self.providers: Dict[str, BaseLLMProvider] = {}

        self._init_providers()

    def _init_providers(self):
        if self.mode == "groq":
            if settings.groq_api_key:
                self.providers["groq"] = GroqProvider()

        # if self.mode == "modal":
        #     if settings.modal_endpoint:
        #         self.providers["modal"] = ModalProvider()

        if not self.providers:
            raise ValueError(f"No LLM provider available for mode: {self.mode}")

    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> str:
        # Determine which provider to use
        provider = self.providers.get(self.mode)

        if not provider:
            raise ValueError(f"Provider not available: {self.mode}")

        # Generate with retry logic
        max_retries = settings.llm_max_retries
        last_error = None

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
    
    async def extract_json(self, prompt: str, **kwargs) -> Dict[str, Any]:
        result = await self.generate(prompt, force_json=True, **kwargs)

        try:
            return json.loads(result)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))

            json_match = re.search(r'\{.*\}', result, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))

            raise ValueError(f"Could not parse JSON from response: {result}")


# Singleton instance
_llm_service: Optional[LLMService] = None

def get_llm_service() -> LLMService:
    """Get singleton LLM service instance"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
