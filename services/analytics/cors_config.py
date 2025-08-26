"""
Ultimate CORS Configuration for Development
This configuration ensures CORS will NEVER fail in development
"""

def setup_cors(app):
    """Setup CORS with maximum permissiveness for development"""
    from fastapi.middleware.cors import CORSMiddleware
    
    # In development, we allow EVERYTHING
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow ALL origins
        allow_credentials=True,
        allow_methods=["*"],  # Allow ALL methods
        allow_headers=["*"],  # Allow ALL headers
        expose_headers=["*"],  # Expose ALL headers
        max_age=3600,  # Cache preflight for 1 hour
    )
    print("[CORS] Configured to allow ALL origins in development mode")
    return app