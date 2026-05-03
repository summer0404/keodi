"""
Unit tests for app.services.ranking.ranking_service module
"""
import pytest
import math
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone, timedelta
import pandas as pd
from app.services.ranking.ranking_service import RankingService, get_ranking_service


class TestRankingService:
    """Test cases for RankingService"""

    @patch('app.services.ranking.ranking_service.BaseRepository')
    async def test_ranking_service_start(self, mock_repo):
        """Test RankingService initialization and start"""
        mock_settings = MagicMock(ltr_model_path="/tmp/test_model.txt")
        with patch('app.services.ranking.ranking_service.get_settings', return_value=mock_settings):
            mock_repo.start = AsyncMock(return_value=MagicMock())

            with patch('app.services.ranking.ranking_service.lgb.Booster'):
                service = RankingService()
                result = await service.start()

                assert result is service
                assert service.base_repository is not None

    def test_calculate_decay_score(self):
        """Test decay score calculation"""
        service = RankingService()
        now = datetime.now(timezone.utc)

        # Test with 0 days elapsed
        score = service.calculate_decay_score(1.0, now, now)
        assert score == 1.0

        # Test with 1 day elapsed
        one_day_ago = now - timedelta(days=1)
        score = service.calculate_decay_score(1.0, now, one_day_ago)
        expected = 1.0 * math.exp(-0.05 * 1)
        assert score == pytest.approx(expected)

        # Test with multiple days
        five_days_ago = now - timedelta(days=5)
        score = service.calculate_decay_score(1.0, now, five_days_ago)
        expected = 1.0 * math.exp(-0.05 * 5)
        assert score == pytest.approx(expected)

    def test_extract_features_no_attributes(self):
        """Test feature extraction with empty attributes"""
        service = RankingService()

        cosine_sim, max_match, dealbreaker, overlap_count = service._extract_features({}, {})

        assert cosine_sim == 0.0
        assert max_match == 0.0
        assert dealbreaker == 0.0
        assert overlap_count == 0

    def test_extract_features_matching_attributes(self):
        """Test feature extraction with matching attributes"""
        service = RankingService()

        user_attrs = {"attr1": 0.8, "attr2": 0.6}
        place_attrs = {"attr1": 0.9, "attr2": 0.7}

        cosine_sim, max_match, dealbreaker, overlap_count = service._extract_features(
            user_attrs, place_attrs
        )

        assert cosine_sim > 0  # Should be positive correlation
        assert max_match > 0
        assert dealbreaker > 0
        assert overlap_count == 2

    def test_extract_features_partial_overlap(self):
        """Test feature extraction with partial overlap"""
        service = RankingService()

        user_attrs = {"attr1": 0.8, "attr2": 0.6, "attr3": 0.5}
        place_attrs = {"attr1": 0.9, "attr4": 0.7}

        cosine_sim, max_match, dealbreaker, overlap_count = service._extract_features(
            user_attrs, place_attrs
        )

        assert cosine_sim > 0
        assert overlap_count == 1  # Only attr1 overlaps

    def test_extract_features_below_threshold(self):
        """Test feature extraction with values below threshold"""
        service = RankingService()

        # Values below MIN_OVERLAP_THRESHOLD (0.2) should not count
        user_attrs = {"attr1": 0.1, "attr2": 0.5}
        place_attrs = {"attr1": 0.1, "attr2": 0.5}

        cosine_sim, max_match, dealbreaker, overlap_count = service._extract_features(
            user_attrs, place_attrs
        )

        assert overlap_count == 1  # Only attr2 meets threshold

    def test_extract_features_single_attribute(self):
        """Test feature extraction with single attribute"""
        service = RankingService()

        user_attrs = {"attr1": 0.8}
        place_attrs = {"attr1": 0.9}

        cosine_sim, max_match, dealbreaker, overlap_count = service._extract_features(
            user_attrs, place_attrs
        )

        assert cosine_sim == 1.0  # Perfect correlation
        assert max_match == pytest.approx(0.72)  # 0.8 * 0.9
        assert dealbreaker == pytest.approx(0.72)
        assert overlap_count == 1

    def test_extract_features_negative_correlation(self):
        """Test feature extraction with negative correlation"""
        service = RankingService()

        user_attrs = {"attr1": 0.8}
        place_attrs = {"attr1": -0.5}

        cosine_sim, max_match, dealbreaker, overlap_count = service._extract_features(
            user_attrs, place_attrs
        )

        # Cosine similarity of [0.8] and [-0.5] is -1.0
        assert cosine_sim == -1.0
        assert max_match < 0  # Negative product

    @patch('app.services.ranking.ranking_service.BaseRepository')
    async def test_ranking_empty_place_ids(self, mock_repo):
        """Test ranking with empty place IDs"""
        mock_settings = MagicMock(ltr_model_path="/tmp/test_model.txt")
        with patch('app.services.ranking.ranking_service.get_settings', return_value=mock_settings):
            mock_repo.start = AsyncMock(return_value=MagicMock())

            with patch('app.services.ranking.ranking_service.lgb.Booster'):
                service = RankingService()
                service.model = MagicMock()

                result = await service.ranking("user1", [])

                assert result == []

    @patch('app.services.ranking.ranking_service.BaseRepository')
    async def test_ranking_no_model(self, mock_repo):
        """Test ranking without trained model"""
        mock_settings = MagicMock(ltr_model_path="/tmp/test_model.txt")
        with patch('app.services.ranking.ranking_service.get_settings', return_value=mock_settings):
            mock_repo.start = AsyncMock(return_value=MagicMock())

            with patch('app.services.ranking.ranking_service.lgb.Booster'):
                service = RankingService()
                service.model = None

                result = await service.ranking("user1", ["place1", "place2"])

                assert len(result) == 2
                assert all(r["ai_score"] == 0.0 for r in result)

    @patch('app.services.ranking.ranking_service.BaseRepository')
    async def test_ranking_with_model(self, mock_repo):
        """Test ranking with trained model"""
        mock_settings = MagicMock(ltr_model_path="/tmp/test_model.txt")
        with patch('app.services.ranking.ranking_service.get_settings', return_value=mock_settings):
            mock_repo.start = AsyncMock(return_value=MagicMock())

            with patch('app.services.ranking.ranking_service.lgb.Booster'):
                service = RankingService()
                service.model = MagicMock()
                service.model.predict = MagicMock(return_value=[0.9, 0.7])
                service.base_repository = MagicMock()
                service.base_repository.db = AsyncMock()
                service.base_repository.db.userattribute.find_many = AsyncMock(return_value=[])
                service.base_repository.db.placeattribute.find_many = AsyncMock(return_value=[])

                result = await service.ranking("user1", ["place1", "place2"])

                assert len(result) == 2
                assert result[0]["ranking_score"] == 0.9
                assert result[1]["ranking_score"] == 0.7

    @patch('app.services.ranking.ranking_service.BaseRepository')
    async def test_ranking_service_singleton(self, mock_repo):
        """Test that get_ranking_service returns singleton"""
        mock_settings = MagicMock(ltr_model_path="/tmp/test_model.txt")
        with patch('app.services.ranking.ranking_service.get_settings', return_value=mock_settings):
            mock_repo.start = AsyncMock(return_value=MagicMock())

            # Reset singleton
            import app.services.ranking.ranking_service as rank_module
            rank_module._ranking_service = None

            with patch('app.services.ranking.ranking_service.lgb.Booster'):
                service1 = await get_ranking_service()
                service2 = await get_ranking_service()

                assert service1 is service2

    def test_run_lightgbm_training_empty_dataframe(self):
        """Test training with empty dataframe"""
        service = RankingService()

        # Should not raise exception
        service._run_lightgbm_training(pd.DataFrame())

        # Model should remain None
        assert service.model is None
