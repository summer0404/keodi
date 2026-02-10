from abc import ABC, abstractmethod

class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> str:
        pass

    def remove_think_steps(self, text: str) -> str:
        import re
        import json

        # Remove <think>...</think> blocks
        cleaned_text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove markdown code blocks
        cleaned_text = re.sub(r'```json\s*', '', cleaned_text)
        cleaned_text = re.sub(r'```\s*', '', cleaned_text)
        
        # Strip whitespace
        cleaned_text = cleaned_text.strip()
        
        # Try to extract JSON object if there's extra text
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned_text)
        if json_match:
            json_str = json_match.group(0)
            # Validate it's valid JSON
            try:
                json.loads(json_str)
                return json_str
            except:
                pass
        
        return cleaned_text


