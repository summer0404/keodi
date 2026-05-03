# Test configuration and fixtures for service, handler, and helper tests only
import pytest
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
import pandas as pd

# Add app directory to path for imports
test_dir = os.path.dirname(__file__)
root_dir = os.path.dirname(test_dir)
sys.path.insert(0, root_dir)


# ==================== Settings Mocks ====================
@pytest.fixture
def mock_settings():
    """Mock Settings with default test values"""
    settings = MagicMock()
    settings.embedding_model = "sentence-transformers/all-MiniLM-L6-v2"
    settings.llm_deployment_mode = "groq"
    settings.groq_api_key = "test-groq-key"
    settings.groq_model = "mixtral-8x7b-32768"
    settings.groq_base_url = "https://api.groq.com/openai/v1"
    settings.groq_max_tokens = 2048
    settings.groq_temperature = 0.7
    settings.modal_endpoint = "test-modal-endpoint"
    settings.modal_api_token = "test-modal-token"
    settings.modal_model = "test-modal-model"
    settings.llm_max_retries = 3
    settings.llm_timeout = 30
    settings.ltr_model_path = "/tmp/test_model.txt"
    settings.ltr_objective = "rank_xendcg"
    settings.ltr_metric = "ndcg"
    settings.ltr_boosting_type = "gbdt"
    settings.ltr_num_leaves = 31
    settings.ltr_learning_rate = 0.05
    settings.ltr_feature_fraction = 0.9
    return settings


# ==================== Embedding Service Mocks ====================
@pytest.fixture
def mock_embedding_service():
    """Mock EmbeddingService"""
    service = MagicMock()
    service.get_embedding = MagicMock(return_value=[0.1, 0.2, 0.3])
    return service


# ==================== LLM Provider Mocks ====================
@pytest.fixture
def mock_llm_provider():
    """Mock BaseLLMProvider"""
    provider = AsyncMock()
    provider.generate = AsyncMock(return_value='{"cleanliness": 0.8, "service": 0.9}')
    provider.remove_think_steps = MagicMock(return_value='{"cleanliness": 0.8, "service": 0.9}')
    return provider


# ==================== LLM Service Mocks ====================
@pytest.fixture
def mock_llm_service():
    """Mock LLMService"""
    service = AsyncMock()
    service.extract_user_intent = AsyncMock(return_value="restaurant")
    service.sentiment_analysis = AsyncMock(return_value='{"cleanliness": 0.8, "service": 0.9}')
    service.start = AsyncMock(return_value=service)
    service.mode = "groq"
    service.providers = {}
    service.embedding_service = AsyncMock()
    service.attribute_repository = AsyncMock()
    return service


# ==================== Attribute Repository Mock ====================
@pytest.fixture
def mock_attribute_repository():
    """Mock AttributeRepository for handler tests"""
    repo = AsyncMock()
    repo.get_all_attributes = AsyncMock(return_value=[
        MagicMock(id="attr1", name="cleanliness", score=0.8),
        MagicMock(id="attr2", name="service", score=0.9),
    ])
    repo.get_attribute_by_name = AsyncMock(return_value=MagicMock(id="attr1", name="cleanliness"))
    return repo


@pytest.fixture
def mock_place_attribute_repository():
    """Mock PlaceAttributeRepository for handler tests"""
    repo = AsyncMock()
    repo.get_place_attribute_by_id = AsyncMock(return_value=MagicMock(
        id="pa1", placeId="place1", attributeId="attr1", score=0.7, reviewCount=5
    ))
    repo.get_place_attiributes_by_place_id_and_threshold = AsyncMock(return_value=[
        MagicMock(attributeId="attr1", score=0.8)
    ])
    return repo


@pytest.fixture
def mock_place_repository():
    """Mock PlaceRepository for handler tests"""
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=MagicMock(id="place1", name="Test Place"))
    repo.update_attributes = AsyncMock()
    return repo


@pytest.fixture
def mock_review_repository():
    """Mock ReviewRepository for handler tests"""
    repo = AsyncMock()
    repo.mark_review_as_analyzed = AsyncMock()
    return repo


@pytest.fixture
def mock_user_repository():
    """Mock UserRepository for handler tests"""
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=MagicMock(id="user1", name="Test User"))
    return repo


@pytest.fixture
def mock_user_attribute_repository():
    """Mock UserAttributeRepository for handler tests"""
    repo = AsyncMock()
    repo.get_user_attribute_by_id = AsyncMock(return_value=MagicMock(
        userId="user1", attributeId="attr1", score=0.5, updatedAt=datetime.now(timezone.utc)
    ))
    repo.update_user_attribute = AsyncMock()
    return repo


@pytest.fixture
def mock_user_action_repository():
    """Mock UserActionRepository for handler tests"""
    repo = AsyncMock()
    repo.create_user_action = AsyncMock()
    return repo


@pytest.fixture
def mock_user_category_repository():
    """Mock UserCategoryRepository for handler tests"""
    repo = AsyncMock()
    repo.update_user_category = AsyncMock()
    return repo


@pytest.fixture
def mock_place_category_repository():
    """Mock PlaceCategoryRepository for handler tests"""
    repo = AsyncMock()
    repo.get_place_categories_by_place_id = AsyncMock(return_value=[
        MagicMock(categoryId="cat1", placeId="place1")
    ])
    return repo


# ==================== Ranking Service Mocks ====================
@pytest.fixture
def mock_ranking_service():
    """Mock RankingService"""
    service = AsyncMock()
    service.model = MagicMock()
    service.base_repository = MagicMock()
    service.ranking = AsyncMock(return_value=[
        {"place_id": "place1", "ranking_score": 0.9},
        {"place_id": "place2", "ranking_score": 0.7},
    ])
    service._prepare_training_data = AsyncMock(return_value=pd.DataFrame())
    service._run_lightgbm_training = MagicMock()
    service._extract_features = MagicMock(return_value=(0.8, 0.9, 0.1, 3))
    service.calculate_decay_score = MagicMock(return_value=0.5)
    service.start = AsyncMock(return_value=service)
    return service


# ==================== Kafka Consumer Mocks ====================
@pytest.fixture
def mock_consumer_service():
    """Mock KafkaConsumerService"""
    service = MagicMock()
    service.register_handler = MagicMock()
    service.start = AsyncMock()
    service.stop = AsyncMock()
    return service


# ==================== Kafka Producer Mocks ====================
@pytest.fixture(autouse=True)
def mock_kafka_producer():
    """Mock Kafka producer to prevent real connections during tests"""
    with patch('app.kafka.decorators.get_producer') as mock_get_producer:
        mock_producer = AsyncMock()
        mock_producer.send_response = AsyncMock()
        mock_producer.send_error_response = AsyncMock()
        mock_get_producer.return_value = mock_producer
        yield mock_get_producer



# ==================== Handlers Fixture ====================
@pytest.fixture
def mock_handlers(
    mock_consumer_service,
    mock_llm_service,
    mock_embedding_service,
    mock_ranking_service,
    mock_place_repository,
    mock_attribute_repository,
    mock_place_attribute_repository,
    mock_review_repository,
    mock_user_attribute_repository,
    mock_user_action_repository,
    mock_user_repository,
    mock_user_category_repository,
    mock_place_category_repository,
):
    """Fixture for Handlers with all mocked dependencies"""
    from app.kafka.handler import Handlers

    with patch('app.kafka.handler.get_consumer_service', return_value=mock_consumer_service):
        handlers = Handlers()

    handlers.consumer_service = mock_consumer_service
    handlers.llm_service = mock_llm_service
    handlers.embedding_service = mock_embedding_service
    handlers.ranking_service = mock_ranking_service
    handlers.place_repository = mock_place_repository
    handlers.attribute_repository = mock_attribute_repository
    handlers.place_attribute_repository = mock_place_attribute_repository
    handlers.review_repository = mock_review_repository
    handlers.user_attribute_repository = mock_user_attribute_repository
    handlers.user_action_repository = mock_user_action_repository
    handlers.user_repository = mock_user_repository
    handlers.user_category_repository = mock_user_category_repository
    handlers.place_category_repository = mock_place_category_repository
    return handlers
