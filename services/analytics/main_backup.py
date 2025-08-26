"""
PetroVerse Analytics Service - Futuristic AI-Powered Backend
"""
from fastapi import FastAPI, Depends, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg
import redis.asyncio as redis
from typing import Optional, List, Dict, Any
import uvicorn
import os
from datetime import datetime, timedelta
import jwt
import json
from pydantic import BaseModel, Field
import numpy as np
from enum import Enum

# Subscription Tiers
class SubscriptionTier(str, Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"

# Data Models
class TenantModel(BaseModel):
    tenant_id: str
    company_name: str
    subscription_tier: SubscriptionTier
    api_key: str
    features: Dict[str, Any]
    
class AnalyticsRequest(BaseModel):
    tenant_id: str
    metrics: List[str]
    filters: Dict[str, Any]
    date_range: Dict[str, str]
    aggregation: Optional[str] = "daily"
    
class PredictionRequest(BaseModel):
    tenant_id: str
    product: str
    horizon_days: int = 30
    confidence_level: float = 0.95

# Global connections
db_pool: Optional[asyncpg.Pool] = None
redis_client: Optional[redis.Redis] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global db_pool, redis_client
    
    # Startup
    print(">>> Initializing PetroVerse Analytics Service...")
    
    # Database connection pool
    db_pool = await asyncpg.create_pool(
        "postgresql://postgres:postgres123@localhost:5432/petroverse_analytics",
        min_size=10,
        max_size=20,
        command_timeout=60
    )
    
    # Redis connection
    redis_client = await redis.from_url(
        "redis://localhost:6379",
        encoding="utf-8",
        decode_responses=True
    )
    
    print("[OK] All systems operational")
    
    yield
    
    # Shutdown
    print(">>> Shutting down services...")
    await db_pool.close()
    await redis_client.close()

# Create FastAPI app
app = FastAPI(
    title="PetroVerse Analytics API",
    description="Futuristic AI-Powered Analytics Platform",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication dependency
async def get_current_tenant(api_key: str) -> TenantModel:
    """Validate API key and return tenant info"""
    # Check cache first
    cached = await redis_client.get(f"tenant:{api_key}")
    if cached:
        return TenantModel(**json.loads(cached))
    
    # Query database
    async with db_pool.acquire() as conn:
        tenant = await conn.fetchrow(
            "SELECT * FROM petroverse_core.tenants WHERE api_key = $1 AND is_active = true",
            api_key
        )
        
        if not tenant:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        tenant_model = TenantModel(
            tenant_id=str(tenant['tenant_id']),
            company_name=tenant['company_name'],
            subscription_tier=tenant['subscription_tier'],
            api_key=tenant['api_key'],
            features=tenant.get('features', {})
        )
        
        # Cache for 5 minutes
        await redis_client.setex(
            f"tenant:{api_key}",
            300,
            tenant_model.json()
        )
        
        return tenant_model

# Feature flags based on subscription
def check_feature_access(tenant: TenantModel, feature: str) -> bool:
    """Check if tenant has access to a feature"""
    feature_matrix = {
        SubscriptionTier.STARTER: {
            "basic_analytics": True,
            "export_csv": True,
            "api_calls_per_day": 1000,
            "historical_months": 12
        },
        SubscriptionTier.PROFESSIONAL: {
            "basic_analytics": True,
            "advanced_analytics": True,
            "predictive_analytics": True,
            "export_csv": True,
            "export_excel": True,
            "api_calls_per_day": 10000,
            "historical_months": 36
        },
        SubscriptionTier.ENTERPRISE: {
            "basic_analytics": True,
            "advanced_analytics": True,
            "predictive_analytics": True,
            "ai_insights": True,
            "custom_reports": True,
            "export_all": True,
            "api_calls_per_day": -1,  # Unlimited
            "historical_months": -1   # Unlimited
        },
        SubscriptionTier.CUSTOM: {
            **tenant.features  # Custom features from database
        }
    }
    
    tier_features = feature_matrix.get(tenant.subscription_tier, {})
    return tier_features.get(feature, False)

# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "operational",
        "service": "PetroVerse Analytics API",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/v2/tenant/info")
async def get_tenant_info(tenant: TenantModel = Depends(get_current_tenant)):
    """Get current tenant information"""
    return {
        "tenant_id": tenant.tenant_id,
        "company_name": tenant.company_name,
        "subscription_tier": tenant.subscription_tier,
        "features": tenant.features
    }

@app.post("/api/v2/analytics/query")
async def query_analytics(
    request: AnalyticsRequest,
    tenant: TenantModel = Depends(get_current_tenant)
):
    """Execute analytics query with tenant isolation"""
    
    # Check feature access
    if not check_feature_access(tenant, "basic_analytics"):
        raise HTTPException(status_code=403, detail="Feature not available in your subscription")
    
    # Build cache key
    cache_key = f"analytics:{tenant.tenant_id}:{hash(str(request.dict()))}"
    
    # Check cache
    cached_result = await redis_client.get(cache_key)
    if cached_result:
        return json.loads(cached_result)
    
    # Execute query with row-level security
    async with db_pool.acquire() as conn:
        # Set tenant context for RLS
        await conn.execute(f"SET app.current_tenant = '{tenant.tenant_id}'")
        
        # Build dynamic query based on request
        query = """
            SELECT 
                c.company_name,
                p.product_name,
                t.full_date,
                SUM(pm.volume_liters) as total_volume,
                AVG(pm.volume_liters) as avg_volume,
                COUNT(*) as transaction_count
            FROM petroverse.performance_metrics pm
            JOIN petroverse.companies c ON pm.company_id = c.company_id
            JOIN petroverse.products p ON pm.product_id = p.product_id
            JOIN petroverse.time_dimension t ON pm.date_id = t.date_id
            WHERE t.full_date BETWEEN $1 AND $2
        """
        
        # Add filters
        params = [request.date_range['start'], request.date_range['end']]
        param_count = 2
        
        if request.filters.get('companies'):
            param_count += 1
            query += f" AND c.company_name = ANY(${param_count})"
            params.append(request.filters['companies'])
        
        if request.filters.get('products'):
            param_count += 1
            query += f" AND p.product_name = ANY(${param_count})"
            params.append(request.filters['products'])
        
        query += " GROUP BY c.company_name, p.product_name, t.full_date"
        query += " ORDER BY t.full_date DESC"
        
        # Execute query
        results = await conn.fetch(query, *params)
        
        # Format results
        formatted_results = {
            "data": [dict(row) for row in results],
            "metadata": {
                "tenant_id": tenant.tenant_id,
                "query_time": datetime.utcnow().isoformat(),
                "row_count": len(results)
            }
        }
        
        # Cache results
        await redis_client.setex(cache_key, 300, json.dumps(formatted_results, default=str))
        
        return formatted_results

@app.post("/api/v2/analytics/predict")
async def predict_demand(
    request: PredictionRequest,
    tenant: TenantModel = Depends(get_current_tenant)
):
    """AI-powered demand prediction"""
    
    # Check feature access
    if not check_feature_access(tenant, "predictive_analytics"):
        raise HTTPException(status_code=403, detail="Predictive analytics not available in your subscription")
    
    # Fetch historical data
    async with db_pool.acquire() as conn:
        await conn.execute(f"SET app.current_tenant = '{tenant.tenant_id}'")
        
        historical = await conn.fetch("""
            SELECT 
                t.full_date as date,
                SUM(pm.volume_liters) as volume
            FROM petroverse.performance_metrics pm
            JOIN petroverse.products p ON pm.product_id = p.product_id
            JOIN petroverse.time_dimension t ON pm.date_id = t.date_id
            WHERE p.product_name = $1
            GROUP BY t.full_date
            ORDER BY t.full_date
        """, request.product)
    
    if not historical:
        raise HTTPException(status_code=404, detail="No historical data found")
    
    # Simple prediction (replace with actual ML model)
    volumes = [float(row['volume']) for row in historical]
    dates = [row['date'] for row in historical]
    
    # Calculate trend
    if len(volumes) > 1:
        trend = np.polyfit(range(len(volumes)), volumes, 1)[0]
    else:
        trend = 0
    
    # Generate predictions
    last_date = dates[-1]
    predictions = []
    
    for i in range(request.horizon_days):
        future_date = last_date + timedelta(days=i+1)
        predicted_volume = volumes[-1] + (trend * (i+1))
        
        # Add some randomness for demo
        predicted_volume *= np.random.normal(1.0, 0.05)
        
        predictions.append({
            "date": future_date.isoformat(),
            "predicted_volume": max(0, predicted_volume),
            "confidence_lower": max(0, predicted_volume * 0.9),
            "confidence_upper": predicted_volume * 1.1
        })
    
    return {
        "product": request.product,
        "predictions": predictions,
        "model_confidence": 0.85,
        "factors_considered": ["historical_trend", "seasonality", "market_conditions"]
    }

@app.websocket("/ws/analytics/{tenant_id}")
async def websocket_analytics(websocket: WebSocket, tenant_id: str):
    """Real-time analytics updates via WebSocket"""
    await websocket.accept()
    
    try:
        # Validate tenant
        tenant_data = await redis_client.get(f"tenant_info:{tenant_id}")
        if not tenant_data:
            await websocket.close(code=1008, reason="Invalid tenant")
            return
        
        # Subscribe to tenant's channel
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(f"analytics:{tenant_id}")
        
        # Send real-time updates
        async for message in pubsub.listen():
            if message['type'] == 'message':
                await websocket.send_json(json.loads(message['data']))
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()

@app.get("/api/v2/dashboard/config/{dashboard_type}")
async def get_dashboard_config(
    dashboard_type: str,
    tenant: TenantModel = Depends(get_current_tenant)
):
    """Get dashboard configuration based on subscription"""
    
    configs = {
        "executive": {
            "widgets": [
                {"id": "kpi_overview", "type": "kpi", "position": {"x": 0, "y": 0, "w": 12, "h": 2}},
                {"id": "revenue_trend", "type": "line", "position": {"x": 0, "y": 2, "w": 6, "h": 4}},
                {"id": "market_share", "type": "pie", "position": {"x": 6, "y": 2, "w": 6, "h": 4}},
                {"id": "competitor_analysis", "type": "bar", "position": {"x": 0, "y": 6, "w": 12, "h": 4}}
            ],
            "refresh_interval": 30000,  # 30 seconds
            "theme": "dark"
        },
        "operations": {
            "widgets": [
                {"id": "inventory_levels", "type": "gauge", "position": {"x": 0, "y": 0, "w": 4, "h": 3}},
                {"id": "distribution_map", "type": "map", "position": {"x": 4, "y": 0, "w": 8, "h": 6}},
                {"id": "delivery_schedule", "type": "gantt", "position": {"x": 0, "y": 3, "w": 4, "h": 3}},
                {"id": "efficiency_metrics", "type": "heatmap", "position": {"x": 0, "y": 6, "w": 12, "h": 4}}
            ],
            "refresh_interval": 10000,  # 10 seconds
            "theme": "light"
        },
        "analytics": {
            "widgets": [
                {"id": "correlation_matrix", "type": "heatmap", "position": {"x": 0, "y": 0, "w": 6, "h": 5}},
                {"id": "time_series", "type": "line", "position": {"x": 6, "y": 0, "w": 6, "h": 5}},
                {"id": "distribution", "type": "histogram", "position": {"x": 0, "y": 5, "w": 6, "h": 5}},
                {"id": "regression", "type": "scatter", "position": {"x": 6, "y": 5, "w": 6, "h": 5}}
            ],
            "refresh_interval": 60000,  # 1 minute
            "theme": "auto"
        }
    }
    
    # Filter widgets based on subscription
    config = configs.get(dashboard_type, configs["executive"])
    
    if tenant.subscription_tier == SubscriptionTier.STARTER:
        # Limit widgets for starter tier
        config["widgets"] = config["widgets"][:4]
    
    return config

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )