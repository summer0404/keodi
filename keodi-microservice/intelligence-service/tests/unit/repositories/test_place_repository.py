"""
Unit tests for app.repositories.place_repository
"""
import pytest
from unittest.mock import MagicMock, AsyncMock

from app.repositories.place_repository import PlaceRepository


def make_repo():
    db = MagicMock()
    db.query_raw = AsyncMock(return_value=[])
    db.place = MagicMock()
    db.place.find_unique = AsyncMock(return_value=None)
    return PlaceRepository(db)


class TestSearchNearbyByEmbedding:
    async def test_filters_published_status(self):
        repo = make_repo()
        await repo.search_nearby_by_embedding(
            embedding_str="[0.1,0.2]", lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        call_args = repo.db.query_raw.call_args[0][0]
        assert "p.status = 'PUBLISHED'" in call_args

    async def test_filters_by_radius(self):
        repo = make_repo()
        await repo.search_nearby_by_embedding(
            embedding_str="[0.1,0.2]", lat=10.76, lng=106.67, radius_km=3.0, limit=5
        )
        call_args = repo.db.query_raw.call_args[0][0]
        assert "3.0" in call_args
        assert "LIMIT 5" in call_args

    async def test_returns_query_result(self):
        repo = make_repo()
        repo.db.query_raw = AsyncMock(return_value=[{"id": "p1", "name": "Cafe A"}])
        result = await repo.search_nearby_by_embedding(
            embedding_str="[0.1]", lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        assert result == [{"id": "p1", "name": "Cafe A"}]


class TestSearchNearbyByCategories:
    async def test_filters_published_status(self):
        repo = make_repo()
        await repo.search_nearby_by_categories(
            category_names=["Cà phê"], lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        call_args = repo.db.query_raw.call_args[0][0]
        assert "p.status = 'PUBLISHED'" in call_args

    async def test_returns_empty_list_when_no_categories(self):
        repo = make_repo()
        result = await repo.search_nearby_by_categories(
            category_names=[], lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        assert result == []
        repo.db.query_raw.assert_not_called()

    async def test_includes_category_filter(self):
        repo = make_repo()
        await repo.search_nearby_by_categories(
            category_names=["Nhà hàng"], lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        call_args = repo.db.query_raw.call_args[0][0]
        assert "Nhà hàng" in call_args


class TestSearchNearbyByText:
    async def test_filters_published_status(self):
        repo = make_repo()
        await repo.search_nearby_by_text(
            text="cafe", lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        call_args = repo.db.query_raw.call_args[0][0]
        assert "p.status = 'PUBLISHED'" in call_args

    async def test_includes_text_filter(self):
        repo = make_repo()
        await repo.search_nearby_by_text(
            text="phở bò", lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        call_args = repo.db.query_raw.call_args[0][0]
        assert "phở bò" in call_args

    async def test_escapes_single_quote_in_text(self):
        repo = make_repo()
        await repo.search_nearby_by_text(
            text="it's", lat=10.76, lng=106.67, radius_km=5.0, limit=5
        )
        call_args = repo.db.query_raw.call_args[0][0]
        assert "it''s" in call_args


class TestSearchNearbyByAttributes:
    async def test_filters_published_status(self):
        repo = make_repo()
        await repo.search_nearby_by_attributes(
            attribute_names=["NOISE_INTENSITY"], lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        call_args = repo.db.query_raw.call_args[0][0]
        assert "p.status = 'PUBLISHED'" in call_args

    async def test_returns_empty_list_when_no_attributes(self):
        repo = make_repo()
        result = await repo.search_nearby_by_attributes(
            attribute_names=[], lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        assert result == []
        repo.db.query_raw.assert_not_called()

    async def test_includes_attribute_filter(self):
        repo = make_repo()
        await repo.search_nearby_by_attributes(
            attribute_names=["SERVICE_QUALITY"], lat=10.76, lng=106.67, radius_km=5.0, limit=10
        )
        call_args = repo.db.query_raw.call_args[0][0]
        assert "SERVICE_QUALITY" in call_args


class TestGetByIdWithDetails:
    async def test_filters_published_status(self):
        repo = make_repo()
        await repo.get_by_id_with_details("place-1")
        call_kwargs = repo.db.place.find_unique.call_args[1]
        assert call_kwargs["where"]["status"] == "PUBLISHED"
        assert call_kwargs["where"]["id"] == "place-1"

    async def test_includes_relations(self):
        repo = make_repo()
        await repo.get_by_id_with_details("place-1")
        call_kwargs = repo.db.place.find_unique.call_args[1]
        assert "placeCategories" in call_kwargs["include"]
        assert "placeAttributes" in call_kwargs["include"]
