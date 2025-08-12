from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import uvicorn
from typing import List

# Import our modules
from models import ChatRequest, ChatResponse, ErrorResponse, HealthCheckResponse, UpdateSessionTitleRequest
from database import get_database_manager
from ai_service import get_ai_service

# Load environment variables
load_dotenv()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Smart Recipe Analyzer API...")
    
    # Initialize services
    try:
        db_manager = get_database_manager()
        ai_service = get_ai_service()
        
        # Health checks
        db_healthy = await db_manager.health_check()
        ai_healthy = await ai_service.health_check()
        
        print(f"📊 Database connection: {'✅ Healthy' if db_healthy else '❌ Failed'}")
        print(f"🤖 AI service connection: {'✅ Healthy' if ai_healthy else '❌ Failed'}")
        
        if not db_healthy:
            print("⚠️  Warning: Database connection failed. Some features may not work.")
        
        if not ai_healthy:
            print("⚠️  Warning: AI service connection failed. Using fallback recipes.")
        
        print("✅ Smart Recipe Analyzer API is ready!")
        
    except Exception as e:
        print(f"❌ Error during startup: {e}")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Smart Recipe Analyzer API...")

# Create FastAPI app
app = FastAPI(
    title="Smart Recipe Analyzer API",
    description="AI-powered recipe generation based on available ingredients",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS configuration
cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Rate limiting configuration from environment
RATE_LIMIT = os.getenv('RATE_LIMIT_REQUESTS', '20')
RATE_LIMIT_PERIOD = os.getenv('RATE_LIMIT_PERIOD', '60')
rate_limit_string = f"{RATE_LIMIT}/{RATE_LIMIT_PERIOD}second"

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            detail="Internal server error occurred",
            error_code="INTERNAL_ERROR"
        ).dict()
    )

# Health check endpoint
@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    try:
        db_manager = get_database_manager()
        ai_service = get_ai_service()
        
        db_healthy = await db_manager.health_check()
        ai_healthy = await ai_service.health_check()
        
        status = "healthy" if db_healthy and ai_healthy else "degraded"
        
        return HealthCheckResponse(
            status=status,
            version="1.0.0"
        )
        
    except Exception as e:
        print(f"Health check error: {e}")
        return HealthCheckResponse(
            status="unhealthy",
            version="1.0.0"
        )

# Main chat endpoint
@app.post("/api/chat/send", response_model=ChatResponse)
@limiter.limit(rate_limit_string)
async def send_chat_message(request: Request, chat_request: ChatRequest):
    """Send a chat message and get recipe recommendations"""
    try:
        # Validate input
        if not chat_request.ingredients.strip():
            raise HTTPException(
                status_code=400,
                detail="Ingredients cannot be empty"
            )
        
        if not chat_request.session_id.strip():
            raise HTTPException(
                status_code=400,
                detail="Session ID cannot be empty"
            )
        
        # Generate recipes using AI
        ai_service = get_ai_service()
        recipes = await ai_service.generate_recipes(chat_request.ingredients)
        
        if not recipes:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate recipes. Please try again."
            )
        
        # Save to database
        db_manager = get_database_manager()
        recipes_dict = [recipe.dict() for recipe in recipes]
        
        chat_id = await db_manager.save_recipe_chat(
            session_id=chat_request.session_id,
            ingredients=chat_request.ingredients,
            recipes=recipes_dict
        )
        
        if not chat_id:
            print("Warning: Failed to save chat to database")
        
        # Return response
        return ChatResponse(
            recipes=recipes,
            session_id=chat_request.session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process your request. Please try again."
        )

# Get all sessions endpoint
@app.get("/api/chat/sessions")
@limiter.limit(rate_limit_string)
async def get_all_sessions(request: Request):
    """Get all chat sessions from database"""
    try:
        db_manager = get_database_manager()
        sessions = await db_manager.get_all_sessions()
        
        return {"sessions": sessions}
        
    except Exception as e:
        print(f"Get sessions endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve sessions"
        )

# Get session history endpoint
@app.get("/api/chat/history/{session_id}")
@limiter.limit(rate_limit_string)
async def get_session_history(request: Request, session_id: str):
    """Get chat history for a specific session"""
    try:
        if not session_id.strip():
            raise HTTPException(
                status_code=400,
                detail="Session ID cannot be empty"
            )
        
        db_manager = get_database_manager()
        chats = await db_manager.get_session_chats(session_id)
        
        # Convert to response format
        history = []
        for chat in chats:
            history.append({
                "id": chat.id,
                "ingredients": chat.ingredients,
                "recipes": chat.recipes_json.get('recipes', []),
                "timestamp": chat.created_at.isoformat()
            })
        
        return {"history": history}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"History endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve chat history"
        )

# Delete session endpoint
@app.delete("/api/chat/session/{session_id}")
@limiter.limit(rate_limit_string)
async def delete_session(request: Request, session_id: str):
    """Delete all chats for a specific session"""
    try:
        if not session_id.strip():
            raise HTTPException(
                status_code=400,
                detail="Session ID cannot be empty"
            )
        
        db_manager = get_database_manager()
        success = await db_manager.delete_session_chats(session_id)
        
        if success:
            return {"message": "Session deleted successfully"}
        else:
            raise HTTPException(
                status_code=404,
                detail="Session not found or already deleted"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete session endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete session"
        )

# Update session title endpoint
@app.put("/api/chat/session/{session_id}/title")
@limiter.limit(rate_limit_string)
async def update_session_title(request: Request, session_id: str, title_request: UpdateSessionTitleRequest):
    """Update the title for a chat session"""
    try:
        # Validate input
        if not session_id.strip():
            raise HTTPException(
                status_code=400,
                detail="Session ID cannot be empty"
            )
        
        # Update session title in database
        db_manager = get_database_manager()
        success = await db_manager.update_session_title(session_id, title_request.title)
        
        if success:
            return {"message": "Session title updated successfully", "title": title_request.title}
        else:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update session title endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update session title"
        )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Smart Recipe Analyzer API",
        "version": "1.0.0",
        "description": "AI-powered recipe generation based on available ingredients",
        "docs": "/docs",
        "health": "/health"
    }

# Run the application
if __name__ == "__main__":
    host = os.getenv('API_HOST', '127.0.0.1')
    port = int(os.getenv('API_PORT', '8000'))
    reload = os.getenv('API_RELOAD', 'true').lower() == 'true'
    
    print(f"🚀 Starting server on {host}:{port}")
    print(f"📚 API Documentation: http://{host}:{port}/docs")
    print(f"🔄 Auto-reload: {reload}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )