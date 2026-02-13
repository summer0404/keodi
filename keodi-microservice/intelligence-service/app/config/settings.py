from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(
        protected_namespaces=(),
        env_file=".env",
        case_sensitive=False,
        extra="allow"
    )
    
    # ========== Application ==========
    app_name: str
    app_version: str
    debug: bool
    log_level: str

    # ========== Server ==========
    host: str
    port: int

    # ========== Kafka ==========
    kafka_bootstrap_servers: str

    @property
    def kafka_topics_list(self) -> List[str]:
        return [t.strip() for t in self.kafka_request_topics.split(',')]

    # ========== Database ==========
    database_url: str
    db_pool_size: int
    db_max_overflow: int

    # ========== Redis ==========
    redis_host: str
    redis_port: int
    redis_password: str

    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # ========== Celery ==========
    celery_broker_url: str
    celery_result_backend: str

    # ========== ML Models Base ==========
    model_path: str
    embedding_model: str
    embedding_cache_size: int

    # ========== LLM Configuration ==========
    llm_deployment_mode: str

    # Groq Configuration
    groq_api_key: str
    groq_model: str
    groq_base_url: str
    groq_max_tokens: int
    groq_temperature: float

    # Modal Configuration
    modal_endpoint: str
    modal_api_token: str
    modal_model: str
    modal_keep_warm: int

    # LLM Performance
    llm_max_retries: int
    llm_timeout: int
    llm_request_timeout: int
    llm_batch_size: int

    # ========== LTR Configuration (LightGBM) ==========
    ltr_model_path: str
    ltr_feature_cache_ttl: int
    ltr_top_k: int
    ltr_batch_size: int

    # LightGBM Training Hyperparameters
    ltr_num_leaves: int
    ltr_max_depth: int
    ltr_learning_rate: float
    ltr_num_iterations: int
    ltr_objective: str
    ltr_metric: str

    # ========== Feature Engineering ==========
    # User behavior
    user_history_window_days: int
    user_max_interactions: int

    # Place features
    place_min_reviews: int
    place_freshness_decay: float

    # Context features
    enable_time_features: bool
    enable_location_features: bool
    enable_social_features: bool

    # ========== Performance & Optimization ==========
    # Model warm-up
    warmup_on_startup: bool
    warmup_requests: int

    # Caching
    cache_llm_responses: bool
    cache_embeddings: bool
    cache_features: bool
    cache_ttl_llm: int
    cache_ttl_embeddings: int
    cache_ttl_features: int


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Convenience function for accessing settings
settings = get_settings()
