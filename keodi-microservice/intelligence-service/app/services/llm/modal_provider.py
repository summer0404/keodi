import httpx
from app.config.settings import get_settings
from app.services.llm.base_provider import BaseLLMProvider

class ModalProvider(BaseLLMProvider):
    def __init__(self):
        settings = get_settings()
        self.endpoint = settings.modal_endpoint
        self.api_token = settings.modal_api_token

        if not self.endpoint:
            raise ValueError("MODAL_ENDPOINT not configured in .env")

    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> str:
        """Generate text using Modal endpoint"""
        settings = get_settings()
        temperature = settings.modal_temperature
        max_tokens = settings.modal_max_tokens

        headers = {}
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"

        payload = {
            "prompt": prompt,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                raw_content = result.get("result") or result.get("text")
                cleaned_content = self.remove_think_steps(raw_content)
                return cleaned_content
        except httpx.HTTPError as e:
            raise Exception(f"Modal API error: {str(e)}")