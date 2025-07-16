"""
AI Video Generator Service
FastAPI service for generating AI videos using veo3-fal-video-ai
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API keys from environment
FAL_API_KEY = os.getenv("FAL_API_KEY")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Server configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8000))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Validate required API keys
if not FAL_API_KEY:
    print("⚠️  WARNING: FAL_API_KEY not set - AI generation will fail")
if not REPLICATE_API_TOKEN:
    print("⚠️  WARNING: REPLICATE_API_TOKEN not set - some models may not work")
if not ANTHROPIC_API_KEY:
    print("⚠️  WARNING: ANTHROPIC_API_KEY not set - some features may not work")

# Initialize FastAPI app
app = FastAPI(
    title="AI Video Generator",
    description="Service for generating AI videos using veo3-fal-video-ai",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # OpenCut frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class VideoGenerationRequest(BaseModel):
    prompt: str
    model: str
    resolution: Optional[str] = "1080p"
    duration: Optional[int] = 5

class VideoGenerationResponse(BaseModel):
    job_id: str
    status: str
    message: str
    estimated_time: Optional[int] = None

class GenerationStatus(BaseModel):
    job_id: str
    status: str
    progress: Optional[int] = None
    video_url: Optional[str] = None
    error: Optional[str] = None

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-video-generator"}

# Available models endpoint
@app.get("/models")
async def get_available_models():
    return {
        "models": [
            {
                "id": "veo3",
                "name": "Veo3",
                "description": "Highest quality, slower generation",
                "price": "$3.00",
                "resolution": "1080p",
                "max_duration": 30
            },
            {
                "id": "veo3_fast",
                "name": "Veo3 Fast",
                "description": "High quality, faster generation",
                "price": "$2.00",
                "resolution": "1080p",
                "max_duration": 30
            },
            {
                "id": "veo2",
                "name": "Veo2",
                "description": "Good quality, balanced speed",
                "price": "$2.50",
                "resolution": "1080p",
                "max_duration": 30
            },
            {
                "id": "hailuo",
                "name": "Hailuo",
                "description": "Fast generation, good quality",
                "price": "$0.08",
                "resolution": "720p",
                "max_duration": 15
            },
            {
                "id": "kling",
                "name": "Kling",
                "description": "Fast generation, cost-effective",
                "price": "$0.10",
                "resolution": "720p",
                "max_duration": 15
            }
        ]
    }

# Generate video endpoint
@app.post("/generate-video", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest):
    """
    Generate an AI video from text prompt
    """
    try:
        # Validate input
        if not request.prompt.strip():
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
        if len(request.prompt) > 500:
            raise HTTPException(status_code=400, detail="Prompt too long (max 500 characters)")
        
        # Mock response for now - will be replaced with actual AI integration
        import uuid
        job_id = str(uuid.uuid4())
        
        return VideoGenerationResponse(
            job_id=job_id,
            status="processing",
            message=f"Video generation started for model: {request.model}",
            estimated_time=60  # 1 minute estimate
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# Check generation status endpoint
@app.get("/status/{job_id}", response_model=GenerationStatus)
async def get_generation_status(job_id: str):
    """
    Check the status of a video generation job
    """
    # Mock response for now
    return GenerationStatus(
        job_id=job_id,
        status="completed",
        progress=100,
        video_url=f"https://mock-video-url.com/{job_id}.mp4"
    )

# Cost estimation endpoint
@app.post("/estimate-cost")
async def estimate_cost(request: VideoGenerationRequest):
    """
    Estimate the cost of video generation
    """
    model_prices = {
        "veo3": 3.00,
        "veo3_fast": 2.00,
        "veo2": 2.50,
        "hailuo": 0.08,
        "kling": 0.10
    }
    
    base_cost = model_prices.get(request.model, 1.00)
    duration_multiplier = max(1, request.duration // 5)  # Cost increases with duration
    
    estimated_cost = base_cost * duration_multiplier
    
    return {
        "model": request.model,
        "duration": request.duration,
        "base_cost": base_cost,
        "estimated_cost": estimated_cost,
        "currency": "USD"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)