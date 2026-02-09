from abc import ABC
from string import Template
from typing import Dict, Any

class BasePromptTemplate(ABC):
    @staticmethod
    def format(template: str, **kwargs) -> str:
        return Template(template).safe_substitute(**kwargs)
    
    @staticmethod
    def format_with_context(template: str, context: Dict[str,Any]) -> str:
        return Template(template).safe_substitute(**context)