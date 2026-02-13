from app.config.settings import get_settings
from app.services.llm.base_provider import BaseLLMProvider

settings = get_settings()


class GroqProvider(BaseLLMProvider):
    def __init__(self):
        try:
            from groq import AsyncGroq
            self.client = AsyncGroq(api_key=settings.groq_api_key)

            # Script for my company PC :))))
            # import httpx
            # http_client = httpx.AsyncClient(verify=False)
            # self.client = AsyncGroq(
            #     api_key=settings.groq_api_key,
            #     http_client=http_client
            # )

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
            raw_content = response.choices[0].message.content

            cleaned_content = self.remove_think_steps(raw_content)
            return cleaned_content
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Groq API Error Details:\n{error_details}")
            raise Exception(f"Groq API error: {str(e)}")
