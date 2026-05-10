"""
Unit tests for app.services.embedding.embedding_service module
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.embedding.embedding_service import EmbeddingService, get_embedding_service


class TestEmbeddingService:
    """Test cases for EmbeddingService"""

    @patch('app.services.embedding.embedding_service.SentenceTransformer')
    def test_embedding_service_initialization(self, mock_model):
        """Test that EmbeddingService initializes with correct model"""
        mock_settings = MagicMock(embedding_model="test-model")
        with patch('app.services.embedding.embedding_service.get_settings', return_value=mock_settings):
            mock_model_instance = MagicMock()
            mock_model.return_value = mock_model_instance

            service = EmbeddingService()

            assert service.model == mock_model_instance
            mock_model.assert_called_once_with("test-model")

    @patch('app.services.embedding.embedding_service.SentenceTransformer')
    def test_get_embedding_success(self, mock_model):
        """Test successful embedding generation"""
        mock_settings = MagicMock(embedding_model="test-model")
        with patch('app.services.embedding.embedding_service.get_settings', return_value=mock_settings):
            mock_model_instance = MagicMock()
            expected_embedding = [0.1, 0.2, 0.3, 0.4]
            mock_model_instance.encode.return_value.tolist.return_value = expected_embedding
            mock_model.return_value = mock_model_instance

            service = EmbeddingService()
            result = service.get_embedding("test text")

            assert result == expected_embedding
            mock_model_instance.encode.assert_called_once_with("test text")

    @patch('app.services.embedding.embedding_service.SentenceTransformer')
    def test_get_embedding_with_special_characters(self, mock_model):
        """Test embedding with special characters"""
        mock_settings = MagicMock(embedding_model="test-model")
        with patch('app.services.embedding.embedding_service.get_settings', return_value=mock_settings):
            mock_model_instance = MagicMock()
            expected_embedding = [0.1, 0.2, 0.3]
            mock_model_instance.encode.return_value.tolist.return_value = expected_embedding
            mock_model.return_value = mock_model_instance

            service = EmbeddingService()
            result = service.get_embedding("café@restaurant #1")

            assert result == expected_embedding
            mock_model_instance.encode.assert_called_once_with("café@restaurant #1")

    @patch('app.services.embedding.embedding_service.SentenceTransformer')
    def test_get_embedding_empty_string(self, mock_model):
        """Test embedding with empty string"""
        mock_settings = MagicMock(embedding_model="test-model")
        with patch('app.services.embedding.embedding_service.get_settings', return_value=mock_settings):
            mock_model_instance = MagicMock()
            mock_model_instance.encode.return_value.tolist.return_value = [0.0]
            mock_model.return_value = mock_model_instance

            service = EmbeddingService()
            result = service.get_embedding("")

            assert result == [0.0]
            mock_model_instance.encode.assert_called_once_with("")

    @patch('app.services.embedding.embedding_service.SentenceTransformer')
    def test_get_embedding_handles_exception(self, mock_model):
        """Test that exceptions are caught and empty list is returned"""
        mock_settings = MagicMock(embedding_model="test-model")
        with patch('app.services.embedding.embedding_service.get_settings', return_value=mock_settings):
            mock_model_instance = MagicMock()
            mock_model_instance.encode.side_effect = Exception("Model error")
            mock_model.return_value = mock_model_instance

            service = EmbeddingService()
            result = service.get_embedding("test text")

            assert result == []

    @patch('app.services.embedding.embedding_service.SentenceTransformer')
    def test_get_embedding_service_singleton(self, mock_model):
        """Test that get_embedding_service returns singleton instance"""
        mock_settings = MagicMock(embedding_model="test-model")
        with patch('app.services.embedding.embedding_service.get_settings', return_value=mock_settings):
            mock_model.return_value = MagicMock()

            # Reset the global singleton
            import app.services.embedding.embedding_service as emb_module
            emb_module._embedding_service = None

            service1 = get_embedding_service()
            service2 = get_embedding_service()

            assert service1 is service2

    @patch('app.services.embedding.embedding_service.SentenceTransformer')
    def test_get_embedding_long_text(self, mock_model):
        """Test embedding with very long text"""
        mock_settings = MagicMock(embedding_model="test-model")
        with patch('app.services.embedding.embedding_service.get_settings', return_value=mock_settings):
            mock_model_instance = MagicMock()
            long_text = "restaurant " * 1000
            mock_model_instance.encode.return_value.tolist.return_value = [0.1] * 384
            mock_model.return_value = mock_model_instance

            service = EmbeddingService()
            result = service.get_embedding(long_text)

            assert len(result) == 384
            assert all(isinstance(x, float) for x in result)

    @patch('app.services.embedding.embedding_service.SentenceTransformer')
    def test_get_embedding_multiple_calls(self, mock_model):
        """Test multiple embedding calls"""
        mock_settings = MagicMock(embedding_model="test-model")
        with patch('app.services.embedding.embedding_service.get_settings', return_value=mock_settings):
            mock_model_instance = MagicMock()
            mock_model_instance.encode.side_effect = [
                MagicMock(tolist=lambda: [0.1, 0.2]),
                MagicMock(tolist=lambda: [0.3, 0.4]),
                MagicMock(tolist=lambda: [0.5, 0.6]),
            ]
            mock_model.return_value = mock_model_instance

            service = EmbeddingService()
            result1 = service.get_embedding("text1")
            result2 = service.get_embedding("text2")
            result3 = service.get_embedding("text3")

            assert result1 == [0.1, 0.2]
            assert result2 == [0.3, 0.4]
            assert result3 == [0.5, 0.6]
