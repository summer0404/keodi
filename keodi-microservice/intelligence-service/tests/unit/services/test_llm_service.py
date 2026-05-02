"""
Unit tests for app.services.llm.llm_service module
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.llm.llm_service import LLMService, get_llm_service


class TestLLMService:
    """Test cases for LLMService"""
    
    @patch('app.services.llm.llm_service.Prompts')
    @patch('app.services.llm.llm_service.get_embedding_service')
    @patch('app.services.llm.llm_service.GroqProvider')
    def test_llm_service_initialization_with_groq(
        self, mock_groq, mock_embedding, mock_prompts
    ):
        """Test LLMService initialization with Groq provider"""
        with patch('app.services.llm.llm_service.settings') as mock_settings:
            mock_settings.llm_deployment_mode = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_prompts.return_value = MagicMock()
            mock_embedding.return_value = MagicMock()
            
            service = LLMService()
            
            assert service.mode == "groq"
            assert "groq" in service.providers
            mock_groq.assert_called_once()
    
    @patch('app.services.llm.llm_service.Prompts')
    @patch('app.services.llm.llm_service.get_embedding_service')
    def test_llm_service_initialization_no_providers(
        self, mock_embedding, mock_prompts
    ):
        """Test LLMService initialization fails when no providers available"""
        with patch('app.services.llm.llm_service.settings') as mock_settings:
            mock_settings.llm_deployment_mode = "groq"
            mock_settings.groq_api_key = None
            mock_settings.modal_endpoint = None
            mock_prompts.return_value = MagicMock()
            mock_embedding.return_value = MagicMock()
            
            with pytest.raises(ValueError, match="No LLM provider available"):
                LLMService()
    
    @patch('app.services.llm.llm_service.Prompts')
    @patch('app.services.llm.llm_service.get_embedding_service')
    @patch('app.services.llm.llm_service.GroqProvider')
    async def test_extract_user_intent_success(
        self, mock_groq, mock_embedding, mock_prompts
    ):
        """Test successful user intent extraction"""
        with patch('app.services.llm.llm_service.settings') as mock_settings:
            mock_settings.llm_deployment_mode = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_settings.llm_max_retries = 1
            
            mock_provider = AsyncMock()
            mock_provider.generate = AsyncMock(return_value="restaurant")
            mock_groq.return_value = mock_provider
            mock_prompts.return_value = MagicMock()
            mock_prompts.return_value.EXTRACT_USER_INTENT = "Search for: ${search}"
            mock_embedding.return_value = MagicMock()
            
            service = LLMService()
            result = await service.extract_user_intent(search="asian food")
            
            assert result == "restaurant"
    
    @patch('app.services.llm.llm_service.Prompts')
    @patch('app.services.llm.llm_service.get_embedding_service')
    @patch('app.services.llm.llm_service.GroqProvider')
    async def test_extract_user_intent_provider_not_found(
        self, mock_groq, mock_embedding, mock_prompts
    ):
        """Test extract_user_intent when provider not available"""
        with patch('app.services.llm.llm_service.settings') as mock_settings:
            mock_settings.llm_deployment_mode = "modal"
            mock_settings.groq_api_key = "test-key"
            mock_settings.modal_endpoint = None
            mock_settings.llm_max_retries = 1
            
            # Need at least one provider to initialize
            mock_groq.return_value = MagicMock()
            mock_settings.llm_deployment_mode = "groq"
            service = LLMService()
            
            # Now switch mode to something unavailable
            service.mode = "modal"
            
            with pytest.raises(ValueError, match="Provider not available"):
                await service.extract_user_intent(search="test")
    
    @patch('app.services.llm.llm_service.Prompts')
    @patch('app.services.llm.llm_service.get_embedding_service')
    @patch('app.services.llm.llm_service.GroqProvider')
    async def test_extract_user_intent_with_retries(
        self, mock_groq, mock_embedding, mock_prompts
    ):
        """Test extract_user_intent retries on failure"""
        with patch('app.services.llm.llm_service.settings') as mock_settings:
            mock_settings.llm_deployment_mode = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_settings.llm_max_retries = 3
            
            mock_provider = AsyncMock()
            mock_provider.generate = AsyncMock(
                side_effect=[Exception("error1"), Exception("error2"), Exception("error3")]
            )
            mock_groq.return_value = mock_provider
            mock_prompts.return_value = MagicMock()
            mock_prompts.return_value.EXTRACT_USER_INTENT = "Search: ${search}"
            mock_embedding.return_value = MagicMock()
            
            service = LLMService()
            
            with pytest.raises(Exception, match="LLM generation failed after 3 retries"):
                await service.extract_user_intent(search="test")
    
    @patch('app.services.llm.llm_service.Prompts')
    @patch('app.services.llm.llm_service.get_embedding_service')
    @patch('app.services.llm.llm_service.GroqProvider')
    async def test_sentiment_analysis_success(
        self, mock_groq, mock_embedding, mock_prompts
    ):
        """Test successful sentiment analysis"""
        with patch('app.services.llm.llm_service.settings') as mock_settings:
            mock_settings.llm_deployment_mode = "groq"
            mock_settings.groq_api_key = "test-key"
            mock_settings.llm_max_retries = 1
            
            mock_provider = AsyncMock()
            mock_provider.generate = AsyncMock(return_value='{"cleanliness": 0.8}')
            mock_groq.return_value = mock_provider
            
            mock_prompts.return_value = MagicMock()
            mock_prompts.return_value.SENTIMENT_ANALYSIS = "Analyze: ${review}\nAttributes: ${attributes}"
            
            mock_attr_repo = AsyncMock()
            # Ensure return values are strings, not mocks
            mock_attr_repo.get_all_attributes = AsyncMock(return_value=[
                MagicMock(name="cleanliness"),
                MagicMock(name="service"),
            ])
            # Set the name attribute on the MagicMocks
            mock_attr_repo.get_all_attributes.return_value[0].name = "cleanliness"
            mock_attr_repo.get_all_attributes.return_value[1].name = "service"
            
            mock_embedding.return_value = MagicMock()
            
            service = LLMService()
            service.attribute_repository = mock_attr_repo
            result = await service.sentiment_analysis(review="Great place!")
            
            assert result == '{"cleanliness": 0.8}'
    
    @patch('app.services.llm.llm_service.Prompts')
    @patch('app.services.llm.llm_service.get_embedding_service')
    @patch('app.services.llm.llm_service.GroqProvider')
    @patch('app.services.llm.llm_service.AttributeRepository')
    async def test_llm_service_start(
        self, mock_attr_repo_cls, mock_groq, mock_embedding, mock_prompts
    ):
        """Test LLMService.start() method"""
        with patch('app.services.llm.llm_service.settings') as mock_settings:
            mock_settings.llm_deployment_mode = "groq"
            mock_settings.groq_api_key = "key"
            mock_prompts.return_value = MagicMock()
            mock_embedding.return_value = MagicMock()
            
            mock_attr_repo = AsyncMock()
            mock_attr_repo_cls.start = AsyncMock(return_value=mock_attr_repo)
            
            service = LLMService()
            result = await service.start()
            
            assert result == service
            assert service.attribute_repository == mock_attr_repo
    
    @patch('app.services.llm.llm_service.Prompts')
    @patch('app.services.llm.llm_service.get_embedding_service')
    @patch('app.services.llm.llm_service.GroqProvider')
    @patch('app.services.llm.llm_service.AttributeRepository')
    async def test_get_llm_service_singleton(
        self, mock_attr_repo_cls, mock_groq, mock_embedding, mock_prompts
    ):
        """Test that get_llm_service returns singleton instance"""
        with patch('app.services.llm.llm_service.settings') as mock_settings:
            mock_settings.llm_deployment_mode = "groq"
            mock_settings.groq_api_key = "key"
            mock_prompts.return_value = MagicMock()
            mock_embedding.return_value = MagicMock()
            
            # Reset singleton
            import app.services.llm.llm_service as llm_module
            llm_module._llm_service = None
            
            mock_attr_repo = AsyncMock()
            mock_attr_repo_cls.start = AsyncMock(return_value=mock_attr_repo)
            
            service1 = await get_llm_service()
            service2 = await get_llm_service()
            
            assert service1 is service2
