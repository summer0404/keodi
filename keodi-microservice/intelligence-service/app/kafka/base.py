from pydantic import BaseModel
from typing import Optional

class BaseMessage(BaseModel):
    correlation_id: Optional[str] = None

