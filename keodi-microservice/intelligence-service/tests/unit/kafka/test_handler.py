"""
Unit tests for app.kafka.handler module
"""
import pytest
import json
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone, timedelta
from app.kafka.handler import Handlers, get_handlers


class TestHandlers:
    """Test cases for Handlers class"""
    
    @pytest.mark.asyncio
    @patch('app.kafka.handler.get_consumer_service')
    async def test_handlers_initialization(self, mock_get_consumer, mock_consumer_service):
        """Test Handlers initialization"""
        mock_get_consumer.return_value = mock_consumer_service
        handlers = Handlers()
        
        assert handlers.consumer_service == mock_consumer_service
        assert handlers.llm_service is None
        assert handlers.embedding_service is None
    
    @pytest.mark.asyncio
    async def test_handlers_start(self, mock_handlers):
        """Test Handlers.start() method initializes all services"""
        assert mock_handlers.llm_service is not None
        assert mock_handlers.embedding_service is not None
        assert mock_handlers.ranking_service is not None
        assert mock_handlers.place_repository is not None
    
    def test_calculate_delta_time_string_datetime(self, mock_handlers):
        """Test delta time calculation with ISO string"""
        now = datetime.now(timezone.utc)
        # Use strftime to ensure it ends with Z and doesn't have double offset
        now_iso = now.strftime('%Y-%m-%dT%H:%M:%S.%f') + 'Z'
        
        delta = mock_handlers.calculate_delta_time(now_iso)
        
        assert 0 <= delta < 1
    
    def test_calculate_delta_time_none(self, mock_handlers):
        """Test delta time calculation with None"""
        delta = mock_handlers.calculate_delta_time(None)
        
        assert delta == 0.0
    
    def test_calculate_delta_time_datetime_object(self, mock_handlers):
        """Test delta time calculation with datetime object"""
        now = datetime.now(timezone.utc)
        past = now - timedelta(days=5)
        
        delta = mock_handlers.calculate_delta_time(past)
        
        assert 4.9 < delta < 5.1
    
    def test_calculate_place_attribute_score(self, mock_handlers):
        """Test place attribute score calculation"""
        # With smoothing factor of 5 and review_count of 5
        # learning_rate = 1 / (5 + 5 + 1) = 1/11 ≈ 0.0909
        current_score = 0.5
        new_score = 0.8
        review_count = 5
        
        result = mock_handlers._calculate_place_attribute_score(
            current_score, new_score, review_count
        )
        
        learning_rate = 1 / (5 + review_count + 1)
        expected = current_score + learning_rate * (new_score - current_score)
        assert abs(result - expected) < 1e-6
    
    def test_calculate_place_attribute_score_first_review(self, mock_handlers):
        """Test place attribute score calculation for first review"""
        current_score = 0.0
        new_score = 0.8
        review_count = 0
        
        result = mock_handlers._calculate_place_attribute_score(
            current_score, new_score, review_count
        )
        
        learning_rate = 1 / (5 + 0 + 1)  # 1/6
        expected = 0.0 + learning_rate * (0.8 - 0.0)
        assert abs(result - expected) < 1e-6
    
    def test_calculate_user_attribute_score(self, mock_handlers):
        """Test user attribute score calculation"""
        current_score = 0.3
        place_score = 0.8
        action = "CLICK"  # ACTION_WEIGHTS["CLICK"] = 0.1
        now = datetime.now(timezone.utc)
        last_updated = now  # No time decay
        
        result = mock_handlers._calculate_user_attribute_score(
            current_score, place_score, action, last_updated
        )
        
        # decay = 1.0 (no time passed)
        # contribution = 0.1 * 0.8 = 0.08
        expected = 0.3 * 1.0 + 0.08
        assert abs(result - expected) < 1e-6
    
    def test_calculate_user_attribute_score_with_decay(self, mock_handlers):
        """Test user attribute score calculation with time decay"""
        current_score = 0.5
        place_score = 0.9
        action = "RATE_5"  # ACTION_WEIGHTS["RATE_5"] = 1.0
        now = datetime.now(timezone.utc)
        last_updated = now - timedelta(days=1)
        
        result = mock_handlers._calculate_user_attribute_score(
            current_score, place_score, action, last_updated
        )
        
        import math
        decay = math.exp(-0.05 * 1)  # 1 day
        contribution = 1.0 * 0.9
        expected = current_score * decay + contribution
        assert abs(result - expected) < 1e-6
    
    def test_calculate_user_attribute_score_negative_action(self, mock_handlers):
        """Test user attribute score calculation with negative action"""
        current_score = 0.5
        place_score = 0.9
        action = "RATE_1"  # ACTION_WEIGHTS["RATE_1"] = -1.0
        now = datetime.now(timezone.utc)
        
        result = mock_handlers._calculate_user_attribute_score(
            current_score, place_score, action, now
        )
        
        contribution = -1.0 * 0.9
        expected = current_score * 1.0 + contribution
        assert abs(result - expected) < 1e-6
    
    @pytest.mark.asyncio
    async def test_extract_user_intent_success(self, mock_handlers, mock_kafka_producer):
        """Test successful user intent extraction"""
        message = {"search": "asian restaurant"}
        headers = {"kafka_correlationId": "123"}
        
        await mock_handlers.extract_user_intent(message, headers)
        
        mock_producer = mock_kafka_producer.return_value
        mock_producer.send_response.assert_called_once()
        payload = json.loads(mock_producer.send_response.call_args[1]["payload"])
        
        assert payload is not None
        assert "keywords" in payload
        assert "embedding" in payload
    
    @pytest.mark.asyncio
    async def test_extract_user_intent_empty_search(self, mock_handlers, mock_kafka_producer):
        """Test user intent extraction with empty search"""
        message = {"search": ""}
        headers = {"kafka_correlationId": "123"}
        
        await mock_handlers.extract_user_intent(message, headers)
        
        mock_producer = mock_kafka_producer.return_value
        mock_producer.send_response.assert_called_once()
        payload = json.loads(mock_producer.send_response.call_args[1]["payload"])
        
        assert payload is not None
        assert "keywords" in payload
    
    @pytest.mark.asyncio
    async def test_sentiment_analysis_success(self, mock_handlers):
        """Test successful sentiment analysis"""
        message = {
            "text": "Great service and clean place!",
            "placeId": "place1",
            "reviewId": "review1"
        }
        headers = {}
        
        # Should not raise exception
        await mock_handlers.sentiment_analysis(message, headers)
        
        # Verify repository calls were made
        mock_handlers.attribute_repository.get_attribute_by_name.assert_called()
    
    @pytest.mark.asyncio
    async def test_sentiment_analysis_invalid_json(self, mock_handlers):
        """Test sentiment analysis with invalid JSON response"""
        message = {
            "text": "Review text",
            "placeId": "place1",
            "reviewId": "review1"
        }
        headers = {}
        
        # Mock service to return invalid JSON
        mock_handlers.llm_service.sentiment_analysis = AsyncMock(
            return_value="invalid json"
        )
        
        with pytest.raises(Exception, match="Invalid JSON format"):
            await mock_handlers.sentiment_analysis(message, headers)
    
    @pytest.mark.asyncio
    async def test_sentiment_analysis_attribute_not_found(self, mock_handlers):
        """Test sentiment analysis when attribute not found"""
        message = {
            "text": "Review text",
            "placeId": "place1",
            "reviewId": "review1"
        }
        headers = {}
        
        # Mock attribute repository to return None
        mock_handlers.attribute_repository.get_attribute_by_name = AsyncMock(
            return_value=None
        )
        
        # Should not raise exception, just skip the attribute
        await mock_handlers.sentiment_analysis(message, headers)
    
    @pytest.mark.asyncio
    async def test_user_action_user_not_found(self, mock_handlers):
        """Test user_action when user not found"""
        message = {
            "userId": "nonexistent_user",
            "placeId": "place1",
            "action": "CLICK"
        }
        headers = {}
        
        mock_handlers.user_repository.get_by_id = AsyncMock(return_value=None)
        
        # Should return early without raising
        await mock_handlers.user_action(message, headers)
    
    @pytest.mark.asyncio
    async def test_user_action_place_not_found(self, mock_handlers):
        """Test user_action when place not found"""
        message = {
            "userId": "user1",
            "placeId": "nonexistent_place",
            "action": "CLICK"
        }
        headers = {}
        
        mock_handlers.place_repository.get_by_id = AsyncMock(return_value=None)
        
        # Should return early without raising
        await mock_handlers.user_action(message, headers)
    
    @pytest.mark.asyncio
    async def test_user_action_success(self, mock_handlers):
        """Test successful user action processing"""
        message = {
            "userId": "user1",
            "placeId": "place1",
            "action": "CLICK"
        }
        headers = {}
        
        # Mock repositories to return valid objects
        mock_handlers.user_repository.get_by_id = AsyncMock(
            return_value=MagicMock(id="user1")
        )
        mock_handlers.place_repository.get_by_id = AsyncMock(
            return_value=MagicMock(id="place1")
        )
        mock_handlers.place_category_repository.get_place_categories_by_place_id = AsyncMock(
            return_value=[MagicMock(categoryId="cat1")]
        )
        
        # Should not raise exception
        await mock_handlers.user_action(message, headers)
    
    @pytest.mark.asyncio
    async def test_train_ranking_model_success(self, mock_handlers):
        """Test successful ranking model training"""
        message = {}
        headers = {}
        
        import pandas as pd
        mock_handlers.ranking_service._prepare_training_data = AsyncMock(
            return_value=pd.DataFrame({"label": [0, 1, 0]})
        )
        
        # Should not raise exception
        await mock_handlers.train_ranking_model(message, headers)
    
    @pytest.mark.asyncio
    async def test_ranking_success(self, mock_handlers, mock_kafka_producer):
        """Test successful ranking request"""
        message = {
            "userId": "user1",
            "placeIds": ["place1", "place2", "place3"]
        }
        headers = {"kafka_correlationId": "123"}
        
        await mock_handlers.ranking(message, headers)
        
        mock_producer = mock_kafka_producer.return_value
        mock_producer.send_response.assert_called_once()
        payload = json.loads(mock_producer.send_response.call_args[1]["payload"])
        
        assert payload is not None
        assert len(payload) > 0
    
    @pytest.mark.asyncio
    async def test_ranking_empty_place_ids(self, mock_handlers, mock_kafka_producer):
        """Test ranking with empty place IDs"""
        message = {
            "userId": "user1",
            "placeIds": []
        }
        headers = {"kafka_correlationId": "123"}
        
        # Ensure it returns empty list instead of default mock value
        mock_handlers.ranking_service.ranking = AsyncMock(return_value=[])
        
        await mock_handlers.ranking(message, headers)
        
        mock_producer = mock_kafka_producer.return_value
        mock_producer.send_response.assert_called_once()
        payload = json.loads(mock_producer.send_response.call_args[1]["payload"])
        
        assert payload == []
    
    @pytest.mark.asyncio
    async def test_get_handlers_singleton(self):
        """Test that get_handlers returns singleton"""
        import app.kafka.handler as handler_module
        handler_module.handlers = None
        
        with patch('app.kafka.handler.Handlers') as mock_handlers_class:
            mock_instance = AsyncMock()
            mock_instance.start = AsyncMock(return_value=mock_instance)
            mock_handlers_class.return_value = mock_instance
            
            handlers1 = await get_handlers()
            handlers2 = await get_handlers()
            
            assert handlers1 is handlers2
