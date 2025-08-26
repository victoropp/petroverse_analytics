"""
Dynamic Configuration System for PetroVerse Analytics
Handles all environment variables and CORS dynamically
"""
import os
from typing import List, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from config.env
config_path = Path(__file__).parent.parent.parent / "config.env"
if config_path.exists():
    load_dotenv(config_path)
else:
    # Fallback to local .env if exists
    load_dotenv()

class Settings:
    """Centralized configuration settings"""
    
    # API Settings
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8003"))
    API_BASE_URL: str = os.getenv("API_BASE_URL", f"http://localhost:{API_PORT}")
    
    # Frontend Settings
    FRONTEND_PORT: int = int(os.getenv("FRONTEND_PORT", "3004"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", f"http://localhost:{FRONTEND_PORT}")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres123@localhost:5432/petroverse_analytics"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-here-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_MINUTES: int = int(os.getenv("JWT_EXPIRATION_MINUTES", "1440"))
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # CORS Configuration
    CORS_ALLOW_ALL_ORIGINS: bool = os.getenv("CORS_ALLOW_ALL_ORIGINS", "true").lower() == "true"
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Get allowed CORS origins dynamically"""
        if self.CORS_ALLOW_ALL_ORIGINS and self.ENVIRONMENT == "development":
            # In development, we can't use "*" with credentials
            # So we generate a comprehensive list of common ports
            return None  # This will signal to use allow_origin_regex instead
        
        # Generate dynamic list of common development ports
        base_origins = []
        
        # Add localhost variations
        for port in range(3000, 3100):  # Cover ports 3000-3099
            base_origins.append(f"http://localhost:{port}")
            base_origins.append(f"http://127.0.0.1:{port}")
        
        # Add ports 8000-8010 for API testing
        for port in range(8000, 8011):
            base_origins.append(f"http://localhost:{port}")
            base_origins.append(f"http://127.0.0.1:{port}")
        
        # Add specific configured frontend URL
        base_origins.append(self.FRONTEND_URL)
        
        # Add any custom origins from environment
        custom_origins = os.getenv("CORS_CUSTOM_ORIGINS", "").split(",")
        if custom_origins and custom_origins[0]:
            base_origins.extend(custom_origins)
        
        return list(set(base_origins))  # Remove duplicates
    
    @property
    def CORS_ALLOW_CREDENTIALS(self) -> bool:
        """Allow credentials in CORS requests"""
        return True
    
    @property
    def CORS_ALLOW_METHODS(self) -> List[str]:
        """Allowed HTTP methods"""
        return ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"]
    
    @property
    def CORS_ALLOW_HEADERS(self) -> List[str]:
        """Allowed headers"""
        return ["*"]
    
    @property
    def CORS_EXPOSE_HEADERS(self) -> List[str]:
        """Exposed headers"""
        return ["*"]
    
    @property
    def CORS_ALLOW_ORIGIN_REGEX(self) -> str:
        """Regex pattern to match all origins in development"""
        if self.CORS_ALLOW_ALL_ORIGINS and self.ENVIRONMENT == "development":
            # Match any origin (http/https, any host, any port)
            return r"https?://.*"
        return None

# Create singleton instance
settings = Settings()

def get_settings() -> Settings:
    """Get settings instance"""
    return settings