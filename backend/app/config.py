from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/taxi_catalog"
    database_pool_size: int = 20
    database_max_overflow: int = 30
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    redis_cache_ttl: int = 3600
    
    # Application
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"
    
    # API
    api_v1_prefix: str = "/api/v1"
    cors_origins: List[str] = ["http://localhost:3000"]
    
    # Data Processing
    batch_size: int = 10000
    max_workers: int = 4
    sample_size: int = 1000
    
    # Cache TTL (seconds)
    metadata_cache_ttl: int = 3600  # 1 hour
    profile_cache_ttl: int = 1800   # 30 minutes
    search_cache_ttl: int = 300     # 5 minutes
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
