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
    """Abstract base class for LLM providers"""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 512,
        **kwargs
    ) -> str:
        """Generate text from prompt"""
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
        """Generate text using Groq API"""
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


# LATER IMPLEMENT OllamaProvider IF NEEDED
# class OllamaProvider(BaseLLMProvider):
#     """Ollama Local Provider (QWen on CPU)"""

#     def __init__(self):
#         try:
#             import ollama
#             self.client = ollama
#             self.model = settings.ollama_model
#             self.base_url = settings.ollama_base_url
#         except ImportError:
#             raise ImportError("Please install ollama: pip install ollama")

#     async def generate(
#         self,
#         prompt: str,
#         temperature: float = 0.1,
#         max_tokens: int = 512,
#         **kwargs
#     ) -> str:
#         """Generate text using Ollama"""
#         try:
#             response = self.client.chat(
#                 model=self.model,
#                 messages=[{"role": "user", "content": prompt}],
#                 options={
#                     "temperature": temperature,
#                     "num_predict": max_tokens,
#                     **kwargs
#                 }
#             )
#             return response['message']['content']
#         except Exception as e:
#             raise Exception(f"Ollama error: {str(e)}")


class LLMService:
    def __init__(self, mode: Optional[str] = None):
        self.mode = mode or settings.llm_deployment_mode
        self.providers: Dict[str, BaseLLMProvider] = {}

        self._init_providers()

    def _init_providers(self):
        """Initialize LLM providers"""
        if self.mode in ["groq", "hybrid"]:
            if settings.groq_api_key:
                self.providers["groq"] = GroqProvider()

        # if self.mode in ["modal", "hybrid"]:
        #     if settings.modal_endpoint:
        #         self.providers["modal"] = ModalProvider()

        # if self.mode in ["ollama", "hybrid"]:
        #     self.providers["ollama"] = OllamaProvider()

        # Validate at least one provider is available
        if not self.providers:
            raise ValueError(f"No LLM provider available for mode: {self.mode}")

    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> str:
        # Determine which provider to use
        if self.mode == "hybrid":
            # Try Groq first (fast + free), fallback to Modal (QWen)
            provider = self._get_hybrid_provider()
        else:
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
                    # Try fallback provider in hybrid mode
                    if self.mode == "hybrid" and provider == self.providers.get("groq"):
                        provider = self.providers.get("modal") or self.providers.get("ollama")
                        continue
                continue

        raise Exception(f"LLM generation failed after {max_retries} retries: {last_error}")

    def _get_hybrid_provider(self) -> BaseLLMProvider:
        """Get provider for hybrid mode (Groq primary, Modal fallback)"""
        # Priority: Groq (free + fast) > Modal (QWen) > Ollama (local)
        for provider_name in ["groq", "modal", "ollama"]:
            if provider_name in self.providers:
                return self.providers[provider_name]

        raise ValueError("No provider available in hybrid mode")

    async def extract_json(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """
        Generate and parse JSON output

        Args:
            prompt: Input prompt (will auto-add JSON formatting instructions)
            **kwargs: Additional arguments

        Returns:
            Parsed JSON dict
        """
        result = await self.generate(prompt, force_json=True, **kwargs)

        # Try to extract JSON from response
        try:
            # Try direct parsing first
            return json.loads(result)
        except json.JSONDecodeError:
            # Try to find JSON in markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))

            # Try to find raw JSON
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
