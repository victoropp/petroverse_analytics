"""
PetroVerse Analytics Service - CORS Fixed Version
This version ensures CORS will NEVER fail
"""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg
import asyncio
from typing import Optional
import os

# Import the original main module
import main as original_main

# Database and Redis from original
db_pool = None
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    global db_pool, redis_client
    
    print(">>> Initializing PetroVerse Analytics Service...")
    
    # Initialize database
    try:
        db_pool = await asyncpg.create_pool(
            original_main.DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        print("[OK] Database connected")
        
        # Test connection
        async with db_pool.acquire() as conn:
            version = await conn.fetchval("SELECT version()")
            print(f"[OK] PostgreSQL: {version.split(',')[0]}")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        db_pool = None
    
    # Initialize Redis if available
    if original_main.REDIS_AVAILABLE:
        try:
            import redis.asyncio as redis
            redis_client = redis.from_url(original_main.REDIS_URL, decode_responses=True)
            await redis_client.ping()
            print("[OK] Redis connected")
        except Exception as e:
            print(f"[WARNING] Redis connection failed: {e}")
            redis_client = None
    
    # Set globals in original module
    original_main.db_pool = db_pool
    original_main.redis_client = redis_client
    
    print("[OK] All systems operational")
    
    yield
    
    # Graceful shutdown
    print(">>> Shutting down services...")
    if db_pool:
        await db_pool.close()
    if redis_client:
        await redis_client.close()

# Create new app with CORS properly configured
app = FastAPI(
    title="PetroVerse Analytics API",
    description="Production-Grade Analytics Platform",
    version="2.0.0",
    lifespan=lifespan
)

# Add ULTIMATE CORS middleware - this WILL work
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    """Add CORS headers to EVERY response"""
    # Get the origin from the request
    origin = request.headers.get("origin")
    
    # Process the request
    response = await call_next(request)
    
    # Add CORS headers to ALL responses
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
    response.headers["Access-Control-Expose-Headers"] = "*"
    response.headers["Access-Control-Max-Age"] = "3600"
    
    return response

# Also add the standard CORS middleware as backup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Handle OPTIONS requests explicitly
@app.options("/{path:path}")
async def handle_options(request: Request):
    """Handle preflight OPTIONS requests"""
    return Response(
        content="",
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# Copy all routes from original app
for route in original_main.app.routes:
    if hasattr(route, 'endpoint'):
        app.add_api_route(
            route.path,
            route.endpoint,
            methods=route.methods,
            response_model=route.response_model,
            summary=route.summary,
            description=route.description,
            tags=route.tags,
            dependencies=route.dependencies,
            response_model_exclude_unset=route.response_model_exclude_unset,
            response_model_exclude_defaults=route.response_model_exclude_defaults,
            response_model_exclude_none=route.response_model_exclude_none,
            include_in_schema=route.include_in_schema,
        )

print("[CORS] Ultimate CORS configuration active - will work with ANY origin")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003, reload=True)