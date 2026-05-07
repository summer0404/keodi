"""
Unit tests for app.services.agent.agent_service module
"""
import json
import pytest
from unittest.mock import MagicMock, patch, AsyncMock

from langchain_core.messages import ToolMessage

from app.services.agent.agent_service import AgentService, get_agent_service


def _patch_all_repo_starts():
    return [
        patch('app.repositories.place_repository.PlaceRepository.start', new_callable=AsyncMock),
        patch('app.repositories.user_attribute_repository.UserAttributeRepository.start', new_callable=AsyncMock),
        patch('app.repositories.user_category_repository.UserCategoryRepository.start', new_callable=AsyncMock),
        patch('app.repositories.review_repository.ReviewRepository.start', new_callable=AsyncMock),
        patch('app.services.agent.agent_service.get_embedding_service'),
    ]


class TestAgentService:
    """Test cases for AgentService"""

    async def test_agent_service_start(self):
        """Test AgentService initialization via start()"""
        patches = _patch_all_repo_starts()
        with patches[0] as p0, patches[1] as p1, patches[2] as p2, patches[3] as p3, patches[4] as p4:
            for p in (p0, p1, p2, p3):
                p.return_value = MagicMock()
            p4.return_value = MagicMock()

            service = AgentService()
            result = await service.start()

        assert result is service
        assert service.place_repository is not None
        assert service.review_repository is not None
        assert service.embedding_service is not None

    async def test_agent_service_singleton(self):
        """Test that get_agent_service returns the same singleton instance"""
        patches = _patch_all_repo_starts()
        with patches[0] as p0, patches[1] as p1, patches[2] as p2, patches[3] as p3, patches[4] as p4:
            for p in (p0, p1, p2, p3):
                p.return_value = MagicMock()
            p4.return_value = MagicMock()

            import app.services.agent.agent_service as agent_module
            agent_module._agent_service = None

            service1 = await get_agent_service()
            service2 = await get_agent_service()

        assert service1 is service2
        agent_module._agent_service = None

    async def test_run_returns_message_and_place_ids(self):
        """Test that run() returns a dict with 'message' and 'placeIds' keys"""
        service = AgentService()
        service.place_repository = MagicMock()
        service.user_attribute_repository = MagicMock()
        service.user_category_repository = MagicMock()
        service.review_repository = MagicMock()
        service.embedding_service = MagicMock()

        expected_result = {"message": "Đây là gợi ý cho bạn!", "placeIds": ["place-1", "place-2"]}

        mock_graph = AsyncMock()
        mock_tool_msg = ToolMessage(
            content=json.dumps(expected_result),
            tool_call_id="test-call-id",
            name="submit_answer",
        )

        mock_graph.ainvoke = AsyncMock(return_value={"messages": [mock_tool_msg]})

        with patch.object(service, '_build_graph', return_value=mock_graph):
            with patch('app.services.agent.agent_service.create_tools', return_value=[]):
                result = await service.run(
                    message="Tôi muốn đi cà phê",
                    user_id="user-123",
                    latitude=10.76,
                    longitude=106.67,
                )

        assert "message" in result
        assert "placeIds" in result
        assert result["message"] == "Đây là gợi ý cho bạn!"
        assert result["placeIds"] == ["place-1", "place-2"]

    async def test_run_handles_missing_submit_answer(self):
        """Test that run() returns empty result when agent never calls submit_answer"""
        service = AgentService()
        service.place_repository = MagicMock()
        service.user_attribute_repository = MagicMock()
        service.user_category_repository = MagicMock()
        service.review_repository = MagicMock()
        service.embedding_service = MagicMock()

        mock_tool_msg = ToolMessage(content="some places", tool_call_id="t1", name="search_places")
        mock_graph = AsyncMock()
        mock_graph.ainvoke = AsyncMock(return_value={"messages": [mock_tool_msg]})

        with patch.object(service, '_build_graph', return_value=mock_graph):
            with patch('app.services.agent.agent_service.create_tools', return_value=[]):
                result = await service.run(
                    message="...",
                    user_id="",
                    latitude=0.0,
                    longitude=0.0,
                )

        assert result == {"message": "", "placeIds": []}

    async def test_run_handles_missing_user_id_gracefully(self):
        """Test that run() completes without raising when user_id is empty"""
        service = AgentService()
        service.place_repository = MagicMock()
        service.user_attribute_repository = MagicMock()
        service.user_category_repository = MagicMock()
        service.review_repository = MagicMock()
        service.embedding_service = MagicMock()

        submit_content = json.dumps({"message": "Không tìm thấy sở thích của bạn.", "placeIds": []})
        mock_tool_msg = ToolMessage(content=submit_content, tool_call_id="t2", name="submit_answer")
        mock_graph = AsyncMock()
        mock_graph.ainvoke = AsyncMock(return_value={"messages": [mock_tool_msg]})

        with patch.object(service, '_build_graph', return_value=mock_graph):
            with patch('app.services.agent.agent_service.create_tools', return_value=[]):
                result = await service.run(
                    message="Tôi muốn đi đâu đó",
                    user_id="",
                    latitude=10.76,
                    longitude=106.67,
                )

        assert isinstance(result, dict)
        assert "message" in result
        assert "placeIds" in result

    async def test_run_handles_invalid_json_from_submit_answer(self):
        """Test that run() returns empty result when submit_answer content is not valid JSON"""
        service = AgentService()
        service.place_repository = MagicMock()
        service.user_attribute_repository = MagicMock()
        service.user_category_repository = MagicMock()
        service.review_repository = MagicMock()
        service.embedding_service = MagicMock()

        mock_tool_msg = ToolMessage(content="not valid json", tool_call_id="t3", name="submit_answer")
        mock_graph = AsyncMock()
        mock_graph.ainvoke = AsyncMock(return_value={"messages": [mock_tool_msg]})

        with patch.object(service, '_build_graph', return_value=mock_graph):
            with patch('app.services.agent.agent_service.create_tools', return_value=[]):
                result = await service.run(
                    message="test",
                    user_id="user-1",
                    latitude=0.0,
                    longitude=0.0,
                )

        assert result == {"message": "", "placeIds": []}


class TestSubmitAnswerTool:
    """Test the submit_answer tool behavior through AgentService tools module"""

    def _make_tools(self, lat=10.76, lng=106.67):
        from app.services.agent.tools import create_tools
        return create_tools(
            MagicMock(), MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=lat, lng=lng,
        )

    def test_submit_answer_returns_correct_json(self):
        """Test that submit_answer tool produces correct JSON format"""
        tools = self._make_tools()
        submit_tool = next(t for t in tools if t.name == "submit_answer")

        raw_result = submit_tool.func(
            message="Bạn có thể thử quán này!",
            place_ids=["place-abc", "place-xyz"],
        )
        parsed = json.loads(raw_result)

        assert parsed["message"] == "Bạn có thể thử quán này!"
        assert parsed["placeIds"] == ["place-abc", "place-xyz"]

    def test_submit_answer_empty_place_ids(self):
        """Test that submit_answer handles empty place_ids list"""
        tools = self._make_tools(lat=0.0, lng=0.0)
        submit_tool = next(t for t in tools if t.name == "submit_answer")

        raw_result = submit_tool.func(message="Không tìm thấy địa điểm phù hợp.", place_ids=[])
        parsed = json.loads(raw_result)

        assert parsed["placeIds"] == []
        assert "Không tìm thấy" in parsed["message"]
