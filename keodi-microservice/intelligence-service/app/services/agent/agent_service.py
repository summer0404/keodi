import json
import logging
from typing import Annotated, Optional

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict

from app.config.settings import get_settings
from app.prompts.prompt import Prompts
from app.repositories.place_repository import PlaceRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.user_attribute_repository import UserAttributeRepository
from app.repositories.user_category_repository import UserCategoryRepository
from app.services.agent.tools import create_tools
from app.services.embedding.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    user_id: str
    latitude: float
    longitude: float


class AgentService:
    place_repository: Optional[PlaceRepository] = None
    user_attribute_repository: Optional[UserAttributeRepository] = None
    user_category_repository: Optional[UserCategoryRepository] = None
    review_repository: Optional[ReviewRepository] = None
    embedding_service = None

    async def start(self):
        self.place_repository = await PlaceRepository.start()
        self.user_attribute_repository = await UserAttributeRepository.start()
        self.user_category_repository = await UserCategoryRepository.start()
        self.review_repository = await ReviewRepository.start()
        self.embedding_service = get_embedding_service()
        return self

    def _build_graph(self, tools: list):
        settings = get_settings()
        # Script for my company PC :))))
        # import httpx
        # http_client = httpx.Client(verify=False)
        # llm = ChatGroq(
        #     api_key=settings.groq_api_key,
        #     model=settings.groq_model,
        #     http_client=http_client,
        #     base_url=settings.groq_base_url.removesuffix("/openai/v1"),
        # )

        llm = ChatGroq(api_key=settings.groq_api_key, model=settings.groq_model)

        llm_with_tools = llm.bind_tools(tools)

        def agent_node(state: AgentState):
            messages = [SystemMessage(content=Prompts.AGENT_SYSTEM)] + state["messages"]
            response = llm_with_tools.invoke(messages)
            return {"messages": [response]}

        def should_continue(state: AgentState) -> str:
            last = state["messages"][-1]
            if hasattr(last, "tool_calls") and last.tool_calls:
                return "tools"
            return END

        def after_tools(state: AgentState) -> str:
            for msg in reversed(state["messages"]):
                if isinstance(msg, ToolMessage) and msg.name == "submit_answer":
                    return END
            return "agent"

        graph = StateGraph(AgentState)
        graph.add_node("agent", agent_node)
        graph.add_node("tools", ToolNode(tools))
        graph.set_entry_point("agent")
        graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
        graph.add_conditional_edges("tools", after_tools, {"agent": "agent", END: END})

        return graph.compile()

    async def run(self, message: str, user_id: str, latitude: float, longitude: float) -> dict:
        tools = create_tools(
            self.place_repository,
            self.user_attribute_repository,
            self.user_category_repository,
            self.review_repository,
            self.embedding_service,
            latitude,
            longitude,
        )
        graph = self._build_graph(tools)

        initial_state: AgentState = {
            "messages": [HumanMessage(content=message)],
            "user_id": user_id,
            "latitude": latitude,
            "longitude": longitude,
        }

        result = await graph.ainvoke(initial_state)

        for msg in reversed(result["messages"]):
            if isinstance(msg, ToolMessage) and msg.name == "submit_answer":
                try:
                    return json.loads(msg.content)
                except (json.JSONDecodeError, TypeError):
                    logger.warning("submit_answer content is not valid JSON: %s", msg.content)

        logger.warning("Agent did not call submit_answer; returning empty result")
        return {"message": "", "placeIds": []}


_agent_service: Optional[AgentService] = None


async def get_agent_service() -> AgentService:
    global _agent_service
    if _agent_service is None:
        _agent_service = await AgentService().start()
    return _agent_service
