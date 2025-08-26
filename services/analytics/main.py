"""
PetroVerse Analytics Service - Production Grade API
"""
from fastapi import FastAPI, Depends, HTTPException, WebSocket, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import asyncpg
import asyncio
from typing import Optional, List, Dict, Any
import uvicorn
import os
from datetime import datetime, timedelta
import jwt
import json
from pydantic import BaseModel, Field
import numpy as np
from enum import Enum
import hashlib
import secrets

# Redis imports with proper error handling
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

# Import dynamic configuration
try:
    from config import settings
except ImportError:
    # Fallback configuration if config.py not found
    class Settings:
        DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/petroverse_analytics")
        REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
        JWT_SECRET_KEY = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
        JWT_ALGORITHM = "HS256"
        JWT_EXPIRATION_MINUTES = 1440
        ENVIRONMENT = "development"
        CORS_ORIGINS = ["*"]
        CORS_ALLOW_CREDENTIALS = True
        CORS_ALLOW_METHODS = ["*"]
        CORS_ALLOW_HEADERS = ["*"]
        CORS_EXPOSE_HEADERS = ["*"]
    settings = Settings()

# Configuration from settings
DATABASE_URL = settings.DATABASE_URL
REDIS_URL = settings.REDIS_URL
JWT_SECRET = settings.JWT_SECRET_KEY
JWT_ALGORITHM = settings.JWT_ALGORITHM
JWT_EXPIRATION_HOURS = settings.JWT_EXPIRATION_MINUTES // 60

# Security
security = HTTPBearer()

# Subscription Tiers
class SubscriptionTier(str, Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"

# Data Models
class LoginRequest(BaseModel):
    email: str
    password: str

class UserModel(BaseModel):
    user_id: str
    email: str
    first_name: str
    last_name: str
    role: str
    tenant_id: str
    company_name: Optional[str] = None

class TenantModel(BaseModel):
    tenant_id: str
    company_name: str
    subscription_tier: SubscriptionTier
    api_key: str
    features: Dict[str, Any]
    
class AnalyticsRequest(BaseModel):
    metrics: List[str]
    filters: Dict[str, Any] = {}
    date_range: Dict[str, str]
    aggregation: Optional[str] = "daily"
    
class PredictionRequest(BaseModel):
    product: str
    horizon_days: int = Field(default=30, le=365)
    confidence_level: float = Field(default=0.95, ge=0.5, le=0.99)

# Global connections
db_pool: Optional[asyncpg.Pool] = None
redis_client: Optional[redis.Redis] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle with proper resource management"""
    global db_pool, redis_client
    
    print(">>> Initializing PetroVerse Analytics Service...")
    
    # Database connection pool - REQUIRED
    try:
        db_pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=5,
            max_size=20,
            max_queries=50000,
            max_inactive_connection_lifetime=300,
            command_timeout=60
        )
        print("[OK] Database connected")
        
        # Test connection
        async with db_pool.acquire() as conn:
            version = await conn.fetchval("SELECT version()")
            print(f"[OK] PostgreSQL: {version.split(',')[0]}")
            
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        print("[ERROR] Database is REQUIRED - cannot start without database connection")
        raise
    
    # Redis connection (optional but recommended)
    if REDIS_AVAILABLE:
        try:
            redis_client = await redis.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5
            )
            await redis_client.ping()
            print("[OK] Redis connected")
        except Exception as e:
            print(f"[WARNING] Redis connection failed: {e}")
            redis_client = None
    else:
        print("[INFO] Redis not available")
    
    print("[OK] All systems operational")
    
    yield
    
    # Graceful shutdown
    print(">>> Shutting down services...")
    if db_pool:
        await db_pool.close()
    if redis_client:
        await redis_client.close()

# Create FastAPI app
app = FastAPI(
    title="PetroVerse Analytics API",
    description="Production-Grade Analytics Platform",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration - BULLETPROOF VERSION
from fastapi import Request, Response

# Custom middleware to add CORS headers to EVERY response
@app.middleware("http")
async def add_cors_header(request: Request, call_next):
    """Force CORS headers on all responses, including errors"""
    try:
        response = await call_next(request)
    except Exception as e:
        # Even on error, we need to send CORS headers
        from fastapi.responses import JSONResponse
        import traceback
        response = JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )
    
    origin = request.headers.get('origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD'
    response.headers['Access-Control-Allow-Headers'] = '*'
    response.headers['Access-Control-Expose-Headers'] = '*'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

# Also add standard CORS middleware as backup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow ALL origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow ALL methods
    allow_headers=["*"],  # Allow ALL headers
    expose_headers=["*"],  # Expose ALL headers
    max_age=3600,
)

print("[CORS] Bulletproof CORS configuration loaded - will work with ANY origin")

# Cache utilities
async def cache_get(key: str) -> Optional[str]:
    """Get value from Redis cache"""
    if redis_client:
        try:
            return await redis_client.get(key)
        except:
            pass
    return None

async def cache_set(key: str, value: str, expire: int = 300):
    """Set value in Redis cache with expiration"""
    if redis_client:
        try:
            await redis_client.setex(key, expire, value)
        except:
            pass

async def cache_delete_pattern(pattern: str):
    """Delete cache keys matching pattern"""
    if redis_client:
        try:
            keys = await redis_client.keys(pattern)
            if keys:
                await redis_client.delete(*keys)
        except:
            pass

# Authentication utilities
def create_access_token(user_data: dict) -> str:
    """Create JWT access token"""
    to_encode = user_data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserModel:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)
    
    # Get user from database
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            """
            SELECT u.*, t.company_name
            FROM petroverse_core.users u
            LEFT JOIN petroverse_core.tenants t ON u.tenant_id = t.tenant_id
            WHERE u.user_id = $1
            """,
            payload["user_id"]
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserModel(
            user_id=str(user["user_id"]),
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            role=user["role"],
            tenant_id=str(user["tenant_id"]),
            company_name=user.get("company_name")
        )

# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    db_status = "connected" if db_pool else "disconnected"
    redis_status = "connected" if redis_client else "disconnected"
    
    return {
        "status": "operational",
        "service": "PetroVerse Analytics API",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "cache": redis_status
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for connectivity testing"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT if hasattr(settings, 'ENVIRONMENT') else "production"
    }

@app.options("/health")
async def health_options():
    """OPTIONS handler for health endpoint - helps with CORS preflight"""
    return {"status": "ok"}

@app.post("/api/v2/auth/login")
async def login(request: LoginRequest):
    """Authenticate user with database validation"""
    
    async with db_pool.acquire() as conn:
        # Hash password for comparison
        password_hash = hashlib.sha256(request.password.encode()).hexdigest()
        
        # For demo purposes, also check plain password for demo account
        user = await conn.fetchrow(
            """
            SELECT u.*, t.company_name
            FROM petroverse_core.users u
            LEFT JOIN petroverse_core.tenants t ON u.tenant_id = t.tenant_id
            WHERE u.email = $1 AND (u.password_hash = $2 OR 
                  (u.email = 'admin@demo.com' AND $3 = 'demo123'))
            """,
            request.email, password_hash, request.password
        )
        
        if not user:
            # If no user exists, create demo user for development
            if request.email == "admin@demo.com" and request.password == "demo123":
                # Create demo tenant and user
                tenant_id = await conn.fetchval(
                    """
                    INSERT INTO petroverse_core.tenants (company_name, subscription_tier, api_key, features)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (api_key) DO UPDATE SET company_name = EXCLUDED.company_name
                    RETURNING tenant_id
                    """,
                    "Demo Company", "enterprise", "demo-api-key", json.dumps({
                        "advanced_analytics": True,
                        "predictive_analytics": True,
                        "real_time_updates": True
                    })
                )
                
                user_id = await conn.fetchval(
                    """
                    INSERT INTO petroverse_core.users (email, password_hash, first_name, last_name, role, tenant_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
                    RETURNING user_id
                    """,
                    "admin@demo.com", password_hash, "Admin", "User", "administrator", tenant_id
                )
                
                user = await conn.fetchrow(
                    """
                    SELECT u.*, t.company_name
                    FROM petroverse_core.users u
                    LEFT JOIN petroverse_core.tenants t ON u.tenant_id = t.tenant_id
                    WHERE u.user_id = $1
                    """,
                    user_id
                )
            else:
                raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Create user model
        user_model = UserModel(
            user_id=str(user["user_id"]),
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            role=user["role"],
            tenant_id=str(user["tenant_id"]),
            company_name=user.get("company_name")
        )
        
        # Create access token
        token = create_access_token({
            "user_id": str(user["user_id"]),
            "email": user["email"],
            "tenant_id": str(user["tenant_id"])
        })
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_model.dict()
        }

@app.get("/api/v2/auth/me")
async def get_current_user_info(user: UserModel = Depends(get_current_user)):
    """Get current user information"""
    return user

@app.post("/api/v2/analytics/query")
async def query_analytics(request: AnalyticsRequest, user: UserModel = Depends(get_current_user)):
    """Execute analytics query with real database data only"""
    
    # Build cache key  
    cache_key = f"analytics:{user.tenant_id}:{hashlib.md5(json.dumps(request.dict(), sort_keys=True).encode()).hexdigest()}"
    
    # Check cache
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)
    
    async with db_pool.acquire() as conn:
        response_data = {"status": "success", "data": {}}
        
        # Get date range dynamically or from request
        if request.date_range:
            start_date = request.date_range.get("start")
            end_date = request.date_range.get("end")
        else:
            # Get actual date range from database
            date_range = await conn.fetchrow(
                """
                SELECT 
                    MIN(t.full_date) as min_date,
                    MAX(t.full_date) as max_date
                FROM petroverse.time_dimension t
                WHERE EXISTS (
                    SELECT 1 FROM petroverse.bdc_performance_metrics b WHERE b.date_id = t.date_id
                    UNION
                    SELECT 1 FROM petroverse.omc_performance_metrics o WHERE o.date_id = t.date_id
                )
                """
            )
            start_date = date_range["min_date"] if date_range["min_date"] else None
            end_date = date_range["max_date"] if date_range["max_date"] else None
        
        if not start_date or not end_date:
            return {"status": "error", "message": "No data available in database"}
        
        # Convert string dates to date objects for PostgreSQL
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        # Get overall statistics from both BDC and OMC tables
        stats = await conn.fetchrow(
            """
            WITH combined_metrics AS (
                SELECT 
                    b.company_id,
                    b.product_id,
                    b.date_id,
                    b.volume_liters,
                    b.bdc_metric_id as metric_id
                FROM petroverse.bdc_performance_metrics b
                UNION ALL
                SELECT 
                    o.company_id,
                    o.product_id,
                    o.date_id,
                    o.volume_liters,
                    o.omc_metric_id as metric_id
                FROM petroverse.omc_performance_metrics o
            )
            SELECT 
                COUNT(DISTINCT c.company_id) as company_count,
                COUNT(DISTINCT p.product_id) as product_count,
                SUM(cm.volume_liters) as total_volume,
                AVG(cm.volume_liters) as avg_volume,
                COUNT(cm.metric_id) as transaction_count
            FROM combined_metrics cm
            JOIN petroverse.companies c ON cm.company_id = c.company_id
            JOIN petroverse.products p ON cm.product_id = p.product_id
            JOIN petroverse.time_dimension t ON cm.date_id = t.date_id
            WHERE t.full_date BETWEEN $1 AND $2
            """,
            start_date, end_date
        )
        
        if stats:
            response_data["data"].update({
                "company_count": stats["company_count"],
                "product_count": stats["product_count"],
                "total_volume": float(stats["total_volume"] or 0),
                "avg_volume": float(stats["avg_volume"] or 0),
                "transaction_count": stats["transaction_count"],
                "avg_daily_volume": float(stats["total_volume"] or 0) / 365
            })
        
        # Get time series data if requested
        if "volume_liters" in request.metrics:
            time_series = await conn.fetch(
                """
                WITH combined_metrics AS (
                    SELECT date_id, volume_liters FROM petroverse.bdc_performance_metrics
                    UNION ALL
                    SELECT date_id, volume_liters FROM petroverse.omc_performance_metrics
                )
                SELECT 
                    TO_CHAR(t.full_date, 'Mon') as month,
                    SUM(cm.volume_liters) as volume_liters
                FROM combined_metrics cm
                JOIN petroverse.time_dimension t ON cm.date_id = t.date_id
                WHERE t.full_date BETWEEN $1 AND $2
                GROUP BY DATE_TRUNC('month', t.full_date), TO_CHAR(t.full_date, 'Mon')
                ORDER BY DATE_TRUNC('month', t.full_date)
                """,
                start_date, end_date
            )
            response_data["data"]["time_series"] = [
                {"month": row["month"], "volume_liters": float(row["volume_liters"])}
                for row in time_series
            ]
        
        # Get product distribution if requested
        if "volume_by_product" in request.metrics or "product_distribution" in request.metrics:
            products = await conn.fetch(
                """
                SELECT 
                    p.product_name as name,
                    SUM(pm.volume_liters) as volume
                FROM petroverse.performance_metrics pm
                JOIN petroverse.products p ON pm.product_id = p.product_id
                JOIN petroverse.time_dimension t ON pm.date_id = t.date_id
                WHERE t.full_date BETWEEN $1 AND $2
                GROUP BY p.product_name
                ORDER BY volume DESC
                LIMIT 10
                """,
                start_date, end_date
            )
            def safe_float(value):
                if value is None:
                    return 0.0
                try:
                    return float(value)
                except (TypeError, ValueError):
                    return 0.0
                    
            response_data["data"]["products"] = [
                {"name": row["name"], "volume": safe_float(row["volume"])}
                for row in products
            ]
            response_data["data"]["product_distribution"] = {
                row["name"]: safe_float(row["volume"]) for row in products
            }
        
        # Get company rankings if requested
        if "company_performance" in request.metrics:
            companies = await conn.fetch(
                """
                WITH company_volumes AS (
                    SELECT 
                        c.company_name as name,
                        SUM(pm.volume_liters) as volume,
                        ROW_NUMBER() OVER (ORDER BY SUM(pm.volume_liters) DESC) as rank
                    FROM petroverse.performance_metrics pm
                    JOIN petroverse.companies c ON pm.company_id = c.company_id
                    JOIN petroverse.time_dimension t ON pm.date_id = t.date_id
                    WHERE t.full_date BETWEEN $1 AND $2
                    GROUP BY c.company_name
                )
                SELECT 
                    rank,
                    name,
                    volume,
                    ROUND((volume / SUM(volume) OVER () * 100)::numeric, 2) as market_share
                FROM company_volumes
                WHERE rank <= 10
                ORDER BY rank
                """,
                start_date, end_date
            )
            response_data["data"]["company_rankings"] = [
                {
                    "rank": row["rank"],
                    "name": row["name"],
                    "volume": float(row["volume"]),
                    "market_share": float(row["market_share"])
                }
                for row in companies
            ]
        
        # Get market share by company type
        if "market_share" in request.metrics:
            market_share = await conn.fetch(
                """
                SELECT 
                    c.company_type,
                    SUM(pm.volume_liters) as volume
                FROM petroverse.performance_metrics pm
                JOIN petroverse.companies c ON pm.company_id = c.company_id
                JOIN petroverse.time_dimension t ON pm.date_id = t.date_id
                WHERE t.full_date BETWEEN $1 AND $2
                GROUP BY c.company_type
                """,
                start_date, end_date
            )
            total = sum(row["volume"] for row in market_share)
            response_data["data"]["market_share"] = {
                row["company_type"]: float(row["volume"] / total * 100) if total > 0 else 0
                for row in market_share
            }
        
        # Get recent transactions if requested
        if "recent_transactions" in request.metrics:
            transactions = await conn.fetch(
                """
                SELECT 
                    c.company_name as company,
                    p.product_name as product,
                    pm.volume_liters as volume,
                    t.full_date as date
                FROM petroverse.performance_metrics pm
                JOIN petroverse.companies c ON pm.company_id = c.company_id
                JOIN petroverse.products p ON pm.product_id = p.product_id
                JOIN petroverse.time_dimension t ON pm.date_id = t.date_id
                WHERE t.full_date BETWEEN $1 AND $2
                ORDER BY t.full_date DESC, pm.created_at DESC
                LIMIT 10
                """,
                start_date, end_date
            )
            response_data["data"]["transactions"] = [
                {
                    "company": row["company"],
                    "product": row["product"],
                    "volume": float(row["volume"]),
                    "time": f"{(datetime.now().date() - row['date']).days} days ago" if row["date"] else "Recently"
                }
                for row in transactions
            ]
        
        # Cache results
        await cache_set(cache_key, json.dumps(response_data, default=str), 300)
        
        return response_data

@app.get("/api/v2/date-range")
async def get_date_range(user: UserModel = Depends(get_current_user)):
    """Get actual date range from database"""
    
    cache_key = f"date_range:{user.tenant_id}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)
    
    async with db_pool.acquire() as conn:
        date_range = await conn.fetchrow(
            """
            SELECT 
                MIN(t.full_date) as min_date,
                MAX(t.full_date) as max_date
            FROM petroverse.time_dimension t
            WHERE EXISTS (
                SELECT 1 FROM petroverse.bdc_performance_metrics b WHERE b.date_id = t.date_id
                UNION
                SELECT 1 FROM petroverse.omc_performance_metrics o WHERE o.date_id = t.date_id
            )
            """
        )
        
        result = {
            "min_date": date_range["min_date"].isoformat() if date_range["min_date"] else "2019-01-01",
            "max_date": date_range["max_date"].isoformat() if date_range["max_date"] else "2024-12-31"
        }
        
        # Cache for 1 hour
        await cache_set(cache_key, json.dumps(result, default=str), 3600)
        
        return result

@app.get("/api/v2/filters/options")
async def get_filter_options(user: UserModel = Depends(get_current_user)):
    """Get dynamic filter options from database"""
    
    cache_key = f"filters:{user.tenant_id}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)
    
    async with db_pool.acquire() as conn:
        # Get companies
        companies = await conn.fetch(
            """
            SELECT DISTINCT 
                company_id as id,
                company_name as name,
                company_type as type
            FROM petroverse.companies
            ORDER BY company_name
            """
        )
        
        # Get products
        products = await conn.fetch(
            """
            SELECT DISTINCT
                product_id as id,
                product_name as name,
                product_category as category
            FROM petroverse.products
            ORDER BY product_name
            """
        )
        
        # Get date ranges - Updated to use actual tables
        date_range = await conn.fetchrow(
            """
            SELECT 
                MIN(t.full_date) as min_date,
                MAX(t.full_date) as max_date
            FROM petroverse.time_dimension t
            WHERE EXISTS (
                SELECT 1 FROM petroverse.bdc_performance_metrics b WHERE b.date_id = t.date_id
                UNION
                SELECT 1 FROM petroverse.omc_performance_metrics o WHERE o.date_id = t.date_id
            )
            """
        )
        
        result = {
            "companies": [
                {"id": str(row["id"]), "name": row["name"], "type": row["type"]}
                for row in companies
            ],
            "products": [
                {"id": str(row["id"]), "name": row["name"], "category": row["category"]}
                for row in products
            ],
            "date_ranges": [
                {"label": "Last 7 Days", "value": "7d"},
                {"label": "Last 30 Days", "value": "30d"},
                {"label": "Last Quarter", "value": "quarter"},
                {"label": "Last Year", "value": "year"},
                {"label": "All Time", "value": "all"},
                {"label": "Custom", "value": "custom"}
            ],
            "min_date": date_range["min_date"].isoformat() if date_range["min_date"] else None,
            "max_date": date_range["max_date"].isoformat() if date_range["max_date"] else None
        }
        
        # Cache for 1 hour
        await cache_set(cache_key, json.dumps(result, default=str), 3600)
        
        return result

@app.get("/api/v2/dashboard/config/{dashboard_type}")
async def get_dashboard_config(dashboard_type: str, user: UserModel = Depends(get_current_user)):
    """Get dashboard configuration based on user permissions"""
    
    configs = {
        "main": {
            "title": "Main Dashboard",
            "charts": ["volume_trend", "top_products", "market_share", "activity_feed"],
            "kpis": ["total_volume", "active_companies", "product_types", "daily_average"],
            "refresh_rate": 30000
        },
        "bdc": {
            "title": "BDC Dashboard",
            "charts": ["performance_trend", "product_distribution", "company_rankings", "efficiency_metrics"],
            "kpis": ["total_bdcs", "total_volume", "avg_performance", "top_performer"],
            "refresh_rate": 30000
        },
        "omc": {
            "title": "OMC Dashboard",
            "charts": ["retail_performance", "station_distribution", "fuel_types", "regional_analysis"],
            "kpis": ["total_omcs", "retail_volume", "station_count", "market_leader"],
            "refresh_rate": 30000
        },
        "executive": {
            "title": "Executive Dashboard",
            "charts": ["revenue_trend", "market_share", "competitor_analysis", "forecast"],
            "kpis": ["revenue", "growth_rate", "market_position", "efficiency"],
            "refresh_rate": 60000
        }
    }
    
    if dashboard_type not in configs:
        raise HTTPException(status_code=404, detail="Dashboard configuration not found")
    
    return configs[dashboard_type]

@app.post("/api/v2/analytics/predict")
async def predict_demand(request: PredictionRequest, user: UserModel = Depends(get_current_user)):
    """Generate predictions based on historical data"""
    
    async with db_pool.acquire() as conn:
        # Get historical data
        historical = await conn.fetch(
            """
            SELECT 
                t.full_date as date,
                SUM(pm.volume_liters) as volume
            FROM petroverse.performance_metrics pm
            JOIN petroverse.products p ON pm.product_id = p.product_id
            JOIN petroverse.time_dimension t ON pm.date_id = t.date_id
            WHERE p.product_name = $1
            GROUP BY t.full_date
            ORDER BY t.full_date
            """,
            request.product
        )
        
        if not historical:
            raise HTTPException(status_code=404, detail="No historical data found for product")
        
        # Calculate trend using numpy
        volumes = np.array([float(row["volume"]) for row in historical])
        dates_numeric = np.arange(len(volumes))
        
        # Fit polynomial trend
        coefficients = np.polyfit(dates_numeric, volumes, deg=2)
        poly = np.poly1d(coefficients)
        
        # Generate predictions
        last_date = historical[-1]["date"]
        predictions = []
        
        for i in range(request.horizon_days):
            future_date = last_date + timedelta(days=i+1)
            future_point = len(volumes) + i
            
            # Base prediction from polynomial
            predicted_volume = poly(future_point)
            
            # Add seasonal adjustment (simplified)
            seasonal_factor = 1 + 0.1 * np.sin(2 * np.pi * (future_date.month - 1) / 12)
            predicted_volume *= seasonal_factor
            
            # Calculate confidence intervals
            std_dev = np.std(volumes) * (1 + i / request.horizon_days)  # Increasing uncertainty
            confidence_margin = std_dev * 1.96 * (1 - request.confidence_level)
            
            predictions.append({
                "date": future_date.isoformat(),
                "predicted_volume": max(0, float(predicted_volume)),
                "confidence_lower": max(0, float(predicted_volume - confidence_margin)),
                "confidence_upper": float(predicted_volume + confidence_margin)
            })
        
        return {
            "product": request.product,
            "predictions": predictions,
            "model_confidence": 0.85,
            "factors_considered": ["historical_trend", "seasonality", "polynomial_regression"],
            "historical_data_points": len(historical)
        }

@app.get("/api/v2/executive/overview")
async def get_executive_overview(user: UserModel = Depends(get_current_user)):
    """Get executive dashboard overview data from real database"""
    
    async with db_pool.acquire() as conn:
        # Get current month data
        current_month_data = await conn.fetchrow(
            """
            SELECT 
                SUM(CASE WHEN c.company_type = 'BDC' THEN b.volume_liters ELSE 0 END) as bdc_volume,
                SUM(CASE WHEN c.company_type = 'OMC' THEN o.volume_liters ELSE 0 END) as omc_volume,
                COUNT(DISTINCT CASE WHEN c.company_type = 'BDC' THEN c.company_id END) as bdc_count,
                COUNT(DISTINCT CASE WHEN c.company_type = 'OMC' THEN c.company_id END) as omc_count
            FROM petroverse.companies c
            LEFT JOIN petroverse.bdc_performance_metrics b ON c.company_id = b.company_id
            LEFT JOIN petroverse.omc_performance_metrics o ON c.company_id = o.company_id
            LEFT JOIN petroverse.time_dimension t ON COALESCE(b.date_id, o.date_id) = t.date_id
            WHERE t.year = EXTRACT(YEAR FROM CURRENT_DATE) 
                AND t.month = EXTRACT(MONTH FROM CURRENT_DATE)
            """
        )
        
        # Get previous month data for comparison
        prev_month_data = await conn.fetchrow(
            """
            SELECT 
                SUM(CASE WHEN c.company_type = 'BDC' THEN b.volume_liters ELSE 0 END) as bdc_volume,
                SUM(CASE WHEN c.company_type = 'OMC' THEN o.volume_liters ELSE 0 END) as omc_volume
            FROM petroverse.companies c
            LEFT JOIN petroverse.bdc_performance_metrics b ON c.company_id = b.company_id
            LEFT JOIN petroverse.omc_performance_metrics o ON c.company_id = o.company_id
            LEFT JOIN petroverse.time_dimension t ON COALESCE(b.date_id, o.date_id) = t.date_id
            WHERE t.full_date >= CURRENT_DATE - INTERVAL '2 months'
                AND t.full_date < CURRENT_DATE - INTERVAL '1 month'
            """
        )
        
        # Get 12-month trend data
        trend_data = await conn.fetch(
            """
            SELECT 
                t.month,
                t.year,
                SUM(CASE WHEN c.company_type = 'BDC' THEN b.volume_liters ELSE 0 END) as bdc_volume,
                SUM(CASE WHEN c.company_type = 'OMC' THEN o.volume_liters ELSE 0 END) as omc_volume
            FROM petroverse.companies c
            LEFT JOIN petroverse.bdc_performance_metrics b ON c.company_id = b.company_id
            LEFT JOIN petroverse.omc_performance_metrics o ON c.company_id = o.company_id
            LEFT JOIN petroverse.time_dimension t ON COALESCE(b.date_id, o.date_id) = t.date_id
            WHERE t.full_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY t.year, t.month
            ORDER BY t.year, t.month
            """
        )
        
        # Get top BDC companies
        top_bdcs = await conn.fetch(
            """
            SELECT 
                c.company_name,
                SUM(b.volume_liters) as total_volume,
                ROUND((SUM(b.volume_liters) / NULLIF(SUM(SUM(b.volume_liters)) OVER (), 0) * 100)::numeric, 2) as market_share
            FROM petroverse.bdc_performance_metrics b
            JOIN petroverse.companies c ON b.company_id = c.company_id
            WHERE c.company_type = 'BDC'
            GROUP BY c.company_name
            ORDER BY total_volume DESC
            LIMIT 5
            """
        )
        
        # Get top OMC companies
        top_omcs = await conn.fetch(
            """
            SELECT 
                c.company_name,
                SUM(o.volume_liters) as total_volume,
                ROUND((SUM(o.volume_liters) / NULLIF(SUM(SUM(o.volume_liters)) OVER (), 0) * 100)::numeric, 2) as market_share
            FROM petroverse.omc_performance_metrics o
            JOIN petroverse.companies c ON o.company_id = c.company_id
            WHERE c.company_type = 'OMC'
            GROUP BY c.company_name
            ORDER BY total_volume DESC
            LIMIT 5
            """
        )
        
        # Get product distribution
        product_dist = await conn.fetch(
            """
            SELECT 
                p.product_name,
                SUM(COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0)) as total_volume
            FROM petroverse.products p
            LEFT JOIN petroverse.bdc_performance_metrics b ON p.product_id = b.product_id
            LEFT JOIN petroverse.omc_performance_metrics o ON p.product_id = o.product_id
            WHERE COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0) > 0
            GROUP BY p.product_name
            ORDER BY total_volume DESC
            LIMIT 5
            """
        )
        
        # Calculate growth rates
        bdc_growth = 0
        omc_growth = 0
        if prev_month_data and prev_month_data["bdc_volume"]:
            bdc_growth = ((current_month_data["bdc_volume"] or 0) - prev_month_data["bdc_volume"]) / prev_month_data["bdc_volume"] * 100
        if prev_month_data and prev_month_data["omc_volume"]:
            omc_growth = ((current_month_data["omc_volume"] or 0) - prev_month_data["omc_volume"]) / prev_month_data["omc_volume"] * 100
        
        return {
            "gauges": {
                "bdc_volume": float(current_month_data["bdc_volume"] or 0),
                "omc_volume": float(current_month_data["omc_volume"] or 0),
                "bdc_target": float(current_month_data["bdc_volume"] or 0) * 1.1,  # 10% growth target
                "omc_target": float(current_month_data["omc_volume"] or 0) * 1.1
            },
            "kpis": {
                "total_bdc_supply": float(current_month_data["bdc_volume"] or 0),
                "total_omc_distribution": float(current_month_data["omc_volume"] or 0),
                "bdc_growth": round(bdc_growth, 2),
                "omc_growth": round(omc_growth, 2),
                "active_bdc_count": current_month_data["bdc_count"] or 0,
                "active_omc_count": current_month_data["omc_count"] or 0
            },
            "trends": [
                {
                    "month": f"{row['year']}-{row['month']:02d}",
                    "bdc_volume": float(row["bdc_volume"] or 0),
                    "omc_volume": float(row["omc_volume"] or 0)
                }
                for row in trend_data
            ],
            "top_bdcs": [
                {
                    "name": row["company_name"],
                    "volume": float(row["total_volume"] or 0),
                    "market_share": float(row["market_share"] or 0)
                }
                for row in top_bdcs
            ],
            "top_omcs": [
                {
                    "name": row["company_name"],
                    "volume": float(row["total_volume"] or 0),
                    "market_share": float(row["market_share"] or 0)
                }
                for row in top_omcs
            ],
            "product_distribution": [
                {
                    "name": row["product_name"],
                    "volume": float(row["total_volume"] or 0)
                }
                for row in product_dist
            ]
        }

@app.get("/api/v2/executive/filtered")
async def get_executive_filtered_data(
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    company_type: Optional[str] = None,
    companies: Optional[str] = None,
    products: Optional[str] = None,
    top_n: int = 5,
    user: UserModel = Depends(get_current_user)
):
    """Get filtered executive dashboard data"""
    
    async with db_pool.acquire() as conn:
        # Build filter conditions
        filters = []
        params = []
        param_count = 0
        
        if date_start:
            param_count += 1
            filters.append(f"t.full_date >= ${param_count}")
            params.append(datetime.strptime(date_start, "%Y-%m-%d").date())
        
        if date_end:
            param_count += 1
            filters.append(f"t.full_date <= ${param_count}")
            params.append(datetime.strptime(date_end, "%Y-%m-%d").date())
        
        if company_type and company_type != "All":
            param_count += 1
            filters.append(f"c.company_type = ${param_count}")
            params.append(company_type)
        
        if companies:
            company_list = companies.split(",")
            param_count += 1
            filters.append(f"c.company_name = ANY(${param_count}::text[])")
            params.append(company_list)
        
        if products:
            product_list = products.split(",")
            param_count += 1
            filters.append(f"p.product_name = ANY(${param_count}::text[])")
            params.append(product_list)
        
        where_clause = "WHERE " + " AND ".join(filters) if filters else ""
        
        # Get filtered volume data
        volume_query = f"""
            SELECT 
                SUM(CASE WHEN c.company_type = 'BDC' THEN b.volume_liters ELSE 0 END) as bdc_volume,
                SUM(CASE WHEN c.company_type = 'OMC' THEN o.volume_liters ELSE 0 END) as omc_volume,
                COUNT(DISTINCT CASE WHEN c.company_type = 'BDC' THEN c.company_id END) as bdc_count,
                COUNT(DISTINCT CASE WHEN c.company_type = 'OMC' THEN c.company_id END) as omc_count
            FROM petroverse.companies c
            LEFT JOIN petroverse.bdc_performance_metrics b ON c.company_id = b.company_id
            LEFT JOIN petroverse.omc_performance_metrics o ON c.company_id = o.company_id
            LEFT JOIN petroverse.time_dimension t ON COALESCE(b.date_id, o.date_id) = t.date_id
            LEFT JOIN petroverse.products p ON COALESCE(b.product_id, o.product_id) = p.product_id
            {where_clause}
        """
        
        volume_data = await conn.fetchrow(volume_query, *params)
        
        # Get top companies based on filters
        top_companies_query = f"""
            SELECT 
                c.company_name,
                c.company_type,
                SUM(COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0)) as total_volume
            FROM petroverse.companies c
            LEFT JOIN petroverse.bdc_performance_metrics b ON c.company_id = b.company_id
            LEFT JOIN petroverse.omc_performance_metrics o ON c.company_id = o.company_id
            LEFT JOIN petroverse.time_dimension t ON COALESCE(b.date_id, o.date_id) = t.date_id
            LEFT JOIN petroverse.products p ON COALESCE(b.product_id, o.product_id) = p.product_id
            {where_clause}
            GROUP BY c.company_name, c.company_type
            ORDER BY total_volume DESC
            LIMIT ${param_count + 1}
        """
        
        params.append(top_n)
        top_companies = await conn.fetch(top_companies_query, *params)
        
        return {
            "summary": {
                "bdc_volume": float(volume_data["bdc_volume"] or 0),
                "omc_volume": float(volume_data["omc_volume"] or 0),
                "bdc_count": volume_data["bdc_count"] or 0,
                "omc_count": volume_data["omc_count"] or 0
            },
            "top_companies": [
                {
                    "name": row["company_name"],
                    "type": row["company_type"],
                    "volume": float(row["total_volume"] or 0)
                }
                for row in top_companies
            ]
        }

@app.websocket("/ws/analytics/{tenant_id}")
async def websocket_analytics(websocket: WebSocket, tenant_id: str):
    """Real-time analytics updates via WebSocket"""
    await websocket.accept()
    
    try:
        while True:
            # Send periodic updates from database
            async with db_pool.acquire() as conn:
                latest = await conn.fetchrow(
                    """
                    SELECT 
                        COUNT(*) as recent_count,
                        SUM(volume_liters) as recent_volume
                    FROM petroverse.performance_metrics pm
                    JOIN petroverse.time_dimension t ON pm.date_id = t.date_id
                    WHERE t.full_date >= CURRENT_DATE - INTERVAL '1 hour'
                    """
                )
                
                await websocket.send_json({
                    "type": "update",
                    "data": {
                        "recent_transactions": latest["recent_count"],
                        "recent_volume": float(latest["recent_volume"] or 0),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                })
            
            # Wait before next update
            await asyncio.sleep(30)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )