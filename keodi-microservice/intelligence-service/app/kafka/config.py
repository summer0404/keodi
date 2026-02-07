from app.config.settings import get_settings
from dataclasses import dataclass

settings = get_settings()

@dataclass
class KafkaConfig:
    bootstrap_servers: str = settings.kafka_bootstrap_servers
    group_id: str = ""
    client_id: str = ""

    def get_consumer_config(self) -> dict:
        return {
            "bootstrap.servers": self.bootstrap_servers,
            "group.id": self.group_id,
            "client.id": self.client_id,
        }
    
    def get_producer_config(self) -> dict:
        return {
            "bootstrap.servers": self.bootstrap_servers,
            "client.id": self.client_id,
        }