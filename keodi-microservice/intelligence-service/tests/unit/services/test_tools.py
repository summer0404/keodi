"""
Unit tests for app.services.agent.tools module
"""
import json
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.services.agent.tools import create_tools


def make_tools(lat=10.76, lng=106.67):
    return create_tools(
        MagicMock(),  # place_repository
        MagicMock(),  # user_attribute_repository
        MagicMock(),  # user_category_repository
        MagicMock(),  # review_repository
        MagicMock(),  # embedding_service
        lat=lat,
        lng=lng,
    )


def get_tool(tools, name):
    return next(t for t in tools if t.name == name)


class TestCreateTools:
    def test_all_tools_registered(self):
        tools = make_tools()
        names = {t.name for t in tools}
        expected = {
            "search_places",
            "search_places_by_category",
            "search_places_by_text",
            "search_places_by_attributes",
            "get_user_profile",
            "get_user_onboarded_categories",
            "get_place_details",
            "get_place_reviews",
            "submit_answer",
        }
        assert expected == names


class TestSearchPlacesByCategory:
    async def test_returns_formatted_results(self):
        mock_place_repo = MagicMock()
        mock_place_repo.search_nearby_by_categories = AsyncMock(return_value=[
            {"id": "p1", "name": "Cafe A", "rating": 4, "full_address": "123 Main St", "distance_km": 1.2},
        ])
        tools = create_tools(
            mock_place_repo, MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "search_places_by_category")
        result = await tool.ainvoke({"category_names": ["Cà phê"], "radius_km": 5.0, "limit": 5})

        assert "p1" in result
        assert "Cafe A" in result
        assert "1.2" in result

    async def test_returns_no_places_message_when_empty(self):
        mock_place_repo = MagicMock()
        mock_place_repo.search_nearby_by_categories = AsyncMock(return_value=[])
        tools = create_tools(
            mock_place_repo, MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "search_places_by_category")
        result = await tool.ainvoke({"category_names": ["Spa"], "radius_km": 5.0, "limit": 5})

        assert "No places found" in result

    async def test_returns_error_message_on_exception(self):
        mock_place_repo = MagicMock()
        mock_place_repo.search_nearby_by_categories = AsyncMock(side_effect=Exception("db error"))
        tools = create_tools(
            mock_place_repo, MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "search_places_by_category")
        result = await tool.ainvoke({"category_names": ["Cà phê"], "radius_km": 5.0, "limit": 5})

        assert "Error" in result


class TestSearchPlacesByText:
    async def test_returns_formatted_results(self):
        mock_place_repo = MagicMock()
        mock_place_repo.search_nearby_by_text = AsyncMock(return_value=[
            {"id": "p2", "name": "Phở Hà Nội", "rating": 5, "full_address": "45 Le Loi", "distance_km": 0.8},
        ])
        tools = create_tools(
            mock_place_repo, MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "search_places_by_text")
        result = await tool.ainvoke({"text": "phở", "radius_km": 5.0, "limit": 5})

        assert "p2" in result
        assert "Phở Hà Nội" in result

    async def test_returns_not_found_message_when_empty(self):
        mock_place_repo = MagicMock()
        mock_place_repo.search_nearby_by_text = AsyncMock(return_value=[])
        tools = create_tools(
            mock_place_repo, MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "search_places_by_text")
        result = await tool.ainvoke({"text": "bún bò", "radius_km": 5.0, "limit": 5})

        assert "bún bò" in result
        assert "No places found" in result

    async def test_returns_error_message_on_exception(self):
        mock_place_repo = MagicMock()
        mock_place_repo.search_nearby_by_text = AsyncMock(side_effect=Exception("db error"))
        tools = create_tools(
            mock_place_repo, MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "search_places_by_text")
        result = await tool.ainvoke({"text": "cafe", "radius_km": 5.0, "limit": 5})

        assert "Error" in result


class TestSearchPlacesByAttributes:
    async def test_returns_formatted_results_with_avg_score(self):
        mock_place_repo = MagicMock()
        mock_place_repo.search_nearby_by_attributes = AsyncMock(return_value=[
            {
                "id": "p3", "name": "Quiet Corner", "rating": 4,
                "full_address": "7 Nguyen Hue", "distance_km": 2.1, "avg_score": 0.85,
            },
        ])
        tools = create_tools(
            mock_place_repo, MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "search_places_by_attributes")
        result = await tool.ainvoke({"attribute_names": ["NOISE_INTENSITY"], "radius_km": 5.0, "limit": 5})

        assert "p3" in result
        assert "0.85" in result

    async def test_returns_no_places_message_when_empty(self):
        mock_place_repo = MagicMock()
        mock_place_repo.search_nearby_by_attributes = AsyncMock(return_value=[])
        tools = create_tools(
            mock_place_repo, MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "search_places_by_attributes")
        result = await tool.ainvoke({"attribute_names": ["EXPENSIVENESS"], "radius_km": 5.0, "limit": 5})

        assert "No places found" in result

    async def test_returns_error_message_on_exception(self):
        mock_place_repo = MagicMock()
        mock_place_repo.search_nearby_by_attributes = AsyncMock(side_effect=Exception("db error"))
        tools = create_tools(
            mock_place_repo, MagicMock(), MagicMock(), MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "search_places_by_attributes")
        result = await tool.ainvoke({"attribute_names": ["SERVICE_QUALITY"], "radius_km": 5.0, "limit": 5})

        assert "Error" in result


class TestGetUserOnboardedCategories:
    async def test_returns_category_names(self):
        cat_a = MagicMock()
        cat_a.name = "Cà phê"
        cat_b = MagicMock()
        cat_b.name = "Nhà hàng"
        entry_a = MagicMock()
        entry_a.category = cat_a
        entry_b = MagicMock()
        entry_b.category = cat_b

        mock_user_cat_repo = MagicMock()
        mock_user_cat_repo.get_onboarded_categories = AsyncMock(return_value=[entry_a, entry_b])

        tools = create_tools(
            MagicMock(), MagicMock(), mock_user_cat_repo, MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "get_user_onboarded_categories")
        result = await tool.ainvoke({"user_id": "user-1"})

        assert "Cà phê" in result
        assert "Nhà hàng" in result

    async def test_returns_none_message_when_empty(self):
        mock_user_cat_repo = MagicMock()
        mock_user_cat_repo.get_onboarded_categories = AsyncMock(return_value=[])

        tools = create_tools(
            MagicMock(), MagicMock(), mock_user_cat_repo, MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "get_user_onboarded_categories")
        result = await tool.ainvoke({"user_id": "user-2"})

        assert "not selected" in result

    async def test_returns_error_on_exception(self):
        mock_user_cat_repo = MagicMock()
        mock_user_cat_repo.get_onboarded_categories = AsyncMock(side_effect=Exception("db error"))

        tools = create_tools(
            MagicMock(), MagicMock(), mock_user_cat_repo, MagicMock(), MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "get_user_onboarded_categories")
        result = await tool.ainvoke({"user_id": "user-3"})

        assert "Could not retrieve" in result


class TestGetPlaceReviews:
    async def test_returns_formatted_reviews(self):
        rv = MagicMock()
        rv.rating = 5
        rv.reviewerName = "Nguyen Van A"
        rv.text = "Quán rất ngon!"

        mock_review_repo = MagicMock()
        mock_review_repo.get_place_reviews = AsyncMock(return_value=[rv])

        tools = create_tools(
            MagicMock(), MagicMock(), MagicMock(), mock_review_repo, MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "get_place_reviews")
        result = await tool.ainvoke({"place_id": "place-1", "limit": 5})

        assert "Nguyen Van A" in result
        assert "Quán rất ngon!" in result
        assert "5" in result

    async def test_returns_no_comment_when_text_is_none(self):
        rv = MagicMock()
        rv.rating = 3
        rv.reviewerName = "Tran Thi B"
        rv.text = None

        mock_review_repo = MagicMock()
        mock_review_repo.get_place_reviews = AsyncMock(return_value=[rv])

        tools = create_tools(
            MagicMock(), MagicMock(), MagicMock(), mock_review_repo, MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "get_place_reviews")
        result = await tool.ainvoke({"place_id": "place-2", "limit": 5})

        assert "(no comment)" in result

    async def test_returns_no_reviews_message_when_empty(self):
        mock_review_repo = MagicMock()
        mock_review_repo.get_place_reviews = AsyncMock(return_value=[])

        tools = create_tools(
            MagicMock(), MagicMock(), MagicMock(), mock_review_repo, MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "get_place_reviews")
        result = await tool.ainvoke({"place_id": "place-3", "limit": 5})

        assert "No reviews found" in result

    async def test_returns_error_on_exception(self):
        mock_review_repo = MagicMock()
        mock_review_repo.get_place_reviews = AsyncMock(side_effect=Exception("db error"))

        tools = create_tools(
            MagicMock(), MagicMock(), MagicMock(), mock_review_repo, MagicMock(),
            lat=10.76, lng=106.67,
        )
        tool = get_tool(tools, "get_place_reviews")
        result = await tool.ainvoke({"place_id": "place-4", "limit": 5})

        assert "Could not retrieve" in result
