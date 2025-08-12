from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    ingredients: str = Field(..., min_length=1, description="Comma-separated list of ingredients")
    session_id: str = Field(..., min_length=1, description="Unique session identifier")

class NutritionInfo(BaseModel):
    """Nutrition information model"""
    calories: int = Field(..., ge=0, description="Calories per serving")
    protein: str = Field(..., description="Protein content (e.g., '12g')")
    carbs: str = Field(..., description="Carbohydrate content (e.g., '45g')")

class Recipe(BaseModel):
    """Recipe model"""
    name: str = Field(..., min_length=1, description="Recipe name")
    ingredients: List[str] = Field(..., description="List of ingredients")
    instructions: List[str] = Field(..., description="Step-by-step instructions")
    cookingTime: str = Field(..., description="Estimated cooking time")
    difficulty: str = Field(..., description="Difficulty level (Easy, Medium, Hard)")
    nutrition: NutritionInfo = Field(..., description="Nutritional information")

class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    recipes: List[Recipe] = Field(..., description="List of generated recipes")
    session_id: str = Field(..., description="Session identifier")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")

class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")

class RecipeChatRecord(BaseModel):
    """Database record model for recipe chats"""
    id: Optional[str] = Field(None, description="UUID primary key")
    session_id: str = Field(..., description="Chat session identifier")
    title: Optional[str] = Field("Recipe Analysis", description="Session title/name")
    ingredients: str = Field(..., description="Original ingredients input")
    recipes_json: Dict[str, Any] = Field(..., description="Generated recipes as JSON")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

class UpdateSessionTitleRequest(BaseModel):
    """Request model for updating session title"""
    title: str = Field(..., min_length=1, max_length=500, description="New session title")

class HealthCheckResponse(BaseModel):
    """Health check response model"""
    status: str = Field(default="healthy", description="Service status")
    timestamp: datetime = Field(default_factory=datetime.now, description="Check timestamp")
    version: str = Field(default="1.0.0", description="API version")