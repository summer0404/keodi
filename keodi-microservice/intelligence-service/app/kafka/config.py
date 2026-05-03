from app.config.settings import get_settings
from dataclasses import dataclass, field

@dataclass
class KafkaConfig:
    bootstrap_servers: str = field(default_factory=lambda: get_settings().kafka_bootstrap_servers)
    group_id: str = "intelligence-consumer"
    client_id: str = "intelligence-client"

    def get_consumer_config(self) -> dict:
        return {
            "bootstrap_servers": self.bootstrap_servers,
            "group_id": self.group_id,
            "client_id": self.client_id,
        }
    
    def get_producer_config(self) -> dict:
        return {
            "bootstrap_servers": self.bootstrap_servers,
            "client_id": self.client_id,
        }