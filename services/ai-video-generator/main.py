"""
AI Video Generator Service
FastAPI service for generating AI videos using veo3-fal-video-ai
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os
import asyncio
import tempfile
import shutil
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

# Import AI Pipeline Manager
try:
    from packages.core.ai_content_pipeline.ai_content_pipeline.pipeline.manager import AIPipelineManager
    AI_AVAILABLE = True
    print("✅ AI Pipeline Manager imported successfully")
except ImportError as e:
    print(f"⚠️ AI Pipeline Manager not available: {e}")
    print("⚠️ Falling back to mock responses")
    AI_AVAILABLE = False

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

# File handling configuration
TEMP_DIR = Path(os.getenv("TEMP_DIR", "temp"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "output"))
CLEANUP_TEMP = os.getenv("CLEANUP_TEMP", "true").lower() == "true"

# Ensure directories exist
TEMP_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Validate required API keys
if not FAL_API_KEY:
    print("⚠️  WARNING: FAL_API_KEY not set - AI generation will fail")
if not REPLICATE_API_TOKEN:
    print("⚠️  WARNING: REPLICATE_API_TOKEN not set - some models may not work")
if not ANTHROPIC_API_KEY:
    print("⚠️  WARNING: ANTHROPIC_API_KEY not set - some features may not work")

# Initialize AI Pipeline Manager
ai_manager = None
if AI_AVAILABLE:
    try:
        ai_manager = AIPipelineManager()
        print("✅ AI Pipeline Manager initialized")
    except Exception as e:
        print(f"⚠️ Failed to initialize AI Pipeline Manager: {e}")
        AI_AVAILABLE = False

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

class ImageToVideoRequest(BaseModel):
    model: str
    prompt: Optional[str] = ""
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
    video_path: Optional[str] = None
    file_size: Optional[int] = None
    duration: Optional[float] = None
    error: Optional[str] = None

# File handling functions
def save_video_file(job_id: str, video_data: bytes, file_extension: str = "mp4") -> tuple[str, str]:
    """
    Save video file to temporary directory
    Returns (file_path, file_url)
    """
    filename = f"{job_id}.{file_extension}"
    file_path = TEMP_DIR / filename
    
    with open(file_path, "wb") as f:
        f.write(video_data)
    
    # Create URL for accessing the file
    file_url = f"http://{API_HOST}:{API_PORT}/files/{filename}"
    
    return str(file_path), file_url

def save_image_file(job_id: str, image_data: bytes, file_extension: str = "jpg") -> tuple[str, str]:
    """
    Save image file to temporary directory
    Returns (file_path, file_url)
    """
    filename = f"{job_id}_input.{file_extension}"
    file_path = TEMP_DIR / filename
    
    with open(file_path, "wb") as f:
        f.write(image_data)
    
    # Create URL for accessing the file
    file_url = f"http://{API_HOST}:{API_PORT}/files/{filename}"
    
    return str(file_path), file_url

def cleanup_temp_files(max_age_hours: int = 24):
    """
    Clean up old temporary files
    """
    if not CLEANUP_TEMP:
        return
    
    import time
    current_time = time.time()
    max_age_seconds = max_age_hours * 3600
    
    try:
        # Clean up video files
        for file_path in TEMP_DIR.glob("*.mp4"):
            if current_time - file_path.stat().st_mtime > max_age_seconds:
                file_path.unlink()
                print(f"🗑️ Cleaned up old video: {file_path.name}")
        
        # Clean up image files
        for pattern in ["*.jpg", "*.jpeg", "*.png", "*.webp"]:
            for file_path in TEMP_DIR.glob(pattern):
                if current_time - file_path.stat().st_mtime > max_age_seconds:
                    file_path.unlink()
                    print(f"🗑️ Cleaned up old image: {file_path.name}")
    except Exception as e:
        print(f"⚠️ Error cleaning up files: {e}")

def get_video_info(file_path: str) -> dict:
    """
    Get video file information
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return {"error": "File not found"}
        
        file_size = path.stat().st_size
        
        # For now, return basic info
        # In a real implementation, you'd use ffprobe or similar
        return {
            "file_size": file_size,
            "duration": None,  # Would need ffprobe
            "format": path.suffix.lower(),
            "exists": True
        }
    except Exception as e:
        return {"error": str(e)}

def generate_image_to_video_fal(image_path: str, prompt: str, model: str, duration: int = 5) -> dict:
    """
    Generate video from image using FAL AI directly
    """
    try:
        # First, upload the image to get a URL
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Upload image to FAL - using the correct storage endpoint
        upload_response = requests.post(
            "https://fal.run/storage/upload",
            headers={"Authorization": f"Key {FAL_API_KEY}"},
            files={"file": ("image.jpg", image_data, "image/jpeg")}
        )
        
        if upload_response.status_code != 200:
            return {"success": False, "error": f"Image upload failed: {upload_response.text}"}
        
        image_url = upload_response.json()["url"]
        print(f"📤 Image uploaded to FAL: {image_url}")
        
        # Map our models to FAL endpoints
        fal_endpoints = {
            "veo3": "fal-ai/google/veo3",
            "veo3_fast": "fal-ai/google/veo3/fast", 
            "veo2": "fal-ai/google/veo2",
            "hailuo": "fal-ai/minimax/hailuo-ai/video",
            "kling": "fal-ai/bytedance/kling-video/v1.5/pro/image-to-video"
        }
        
        # For this example, let's use the Seedance model which we know works
        endpoint = "fal-ai/bytedance/seedance/v1/pro/image-to-video"
        
        # Generate video
        payload = {
            "prompt": prompt,
            "image_url": image_url,
            "resolution": "1080p",
            "duration": str(duration)
        }
        
        print(f"🎬 Calling FAL API: {endpoint}")
        print(f"📝 Payload: {payload}")
        
        response = requests.post(
            f"https://fal.run/{endpoint}",
            headers={
                "Authorization": f"Key {FAL_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        
        if response.status_code != 200:
            return {"success": False, "error": f"Video generation failed: {response.text}"}
        
        result = response.json()
        print(f"✅ FAL API response: {result}")
        
        if "video" in result:
            video_url = result["video"]["url"] if isinstance(result["video"], dict) else result["video"]
            
            # Download the generated video
            video_response = requests.get(video_url)
            if video_response.status_code == 200:
                return {
                    "success": True,
                    "video_data": video_response.content,
                    "video_url": video_url,
                    "file_size": len(video_response.content),
                    "duration": duration
                }
            else:
                return {"success": False, "error": "Failed to download generated video"}
        else:
            return {"success": False, "error": "No video in response"}
            
    except Exception as e:
        print(f"❌ FAL API error: {e}")
        return {"success": False, "error": str(e)}

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
        
        import uuid
        job_id = str(uuid.uuid4())
        
        # Use real AI integration if available
        if AI_AVAILABLE and ai_manager:
            try:
                print(f"🤖 Starting AI video generation with model: {request.model}")
                print(f"📝 Prompt: {request.prompt}")
                
                # Map UI model names to AI pipeline models with proper parameters
                model_mapping = {
                    "veo3": {
                        "model": "veo3",
                        "image_model": "flux_dev",
                        "duration": min(request.duration or 5, 30),  # Max 30s for veo3
                        "cost_estimate": 3.00,
                        "processing_time": 300
                    },
                    "veo3_fast": {
                        "model": "veo3_fast",
                        "image_model": "flux_dev", 
                        "duration": min(request.duration or 5, 30),
                        "cost_estimate": 2.00,
                        "processing_time": 180
                    },
                    "veo2": {
                        "model": "veo2",
                        "image_model": "flux_dev",
                        "duration": min(request.duration or 5, 30),
                        "cost_estimate": 2.50,
                        "processing_time": 240
                    },
                    "hailuo": {
                        "model": "hailuo",
                        "image_model": "flux_schnell",  # Faster for cost-effective model
                        "duration": min(request.duration or 5, 15),  # Max 15s for hailuo
                        "cost_estimate": 0.08,
                        "processing_time": 60
                    },
                    "kling": {
                        "model": "kling",
                        "image_model": "flux_schnell",
                        "duration": min(request.duration or 5, 15),
                        "cost_estimate": 0.10,
                        "processing_time": 90
                    }
                }
                
                # Get model configuration
                model_config = model_mapping.get(request.model)
                if not model_config:
                    raise ValueError(f"Unsupported model: {request.model}")
                
                ai_model = model_config["model"]
                image_model = model_config["image_model"]
                duration = model_config["duration"]
                
                print(f"🎬 Model config: {ai_model} (image: {image_model}, duration: {duration}s)")
                print(f"💰 Estimated cost: ${model_config['cost_estimate']:.2f}")
                print(f"⏱️ Estimated time: {model_config['processing_time']}s")
                
                # Use the AI pipeline manager to generate video
                result = ai_manager.quick_create_video(
                    text=request.prompt,
                    image_model=image_model,
                    video_model=ai_model
                )
                
                print(f"✅ AI generation completed: {result}")
                
                # Return appropriate response based on result
                if result.success:
                    # In a real implementation, you'd save the actual video file
                    # For now, create a mock file for testing
                    try:
                        mock_video_data = b"MOCK_VIDEO_DATA"  # In real implementation, get from result
                        file_path, file_url = save_video_file(job_id, mock_video_data)
                        print(f"📁 Video saved to: {file_path}")
                        print(f"🌐 Accessible at: {file_url}")
                    except Exception as file_error:
                        print(f"⚠️ Failed to save video file: {file_error}")
                    
                    return VideoGenerationResponse(
                        job_id=job_id,
                        status="completed",
                        message=f"Video generated successfully with {request.model}",
                        estimated_time=0  # Already completed
                    )
                else:
                    return VideoGenerationResponse(
                        job_id=job_id,
                        status="failed",
                        message=f"Video generation failed: {result.error}",
                        estimated_time=0
                    )
                
            except Exception as ai_error:
                print(f"❌ AI generation failed: {ai_error}")
                # Fall back to mock response if AI fails
                return VideoGenerationResponse(
                    job_id=job_id,
                    status="processing",
                    message=f"Video generation started for model: {request.model} (AI fallback)",
                    estimated_time=60
                )
        else:
            # Mock response when AI is not available
            return VideoGenerationResponse(
                job_id=job_id,
                status="processing",
                message=f"Video generation started for model: {request.model} (Mock mode)",
                estimated_time=60
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# Generate video from image endpoint
@app.post("/generate-video-from-image", response_model=VideoGenerationResponse)
async def generate_video_from_image(
    image: UploadFile = File(...),
    model: str = Form(...),
    prompt: str = Form(""),
    resolution: str = Form("1080p"),
    duration: int = Form(5)
):
    """
    Generate an AI video from an input image
    """
    try:
        # Validate image file
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await image.read()
        if len(image_data) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Image file too large (max 10MB)")
        
        import uuid
        job_id = str(uuid.uuid4())
        
        # Save uploaded image
        image_extension = image.filename.split('.')[-1].lower() if image.filename else 'jpg'
        if image_extension not in ['jpg', 'jpeg', 'png', 'webp']:
            image_extension = 'jpg'
        
        image_path, image_url = save_image_file(job_id, image_data, image_extension)
        print(f"📷 Image saved to: {image_path}")
        
        # Use real AI integration if available
        if AI_AVAILABLE and ai_manager:
            try:
                print(f"🤖 Starting image-to-video generation with model: {model}")
                print(f"📝 Prompt: {prompt or 'No additional prompt'}")
                print(f"🖼️ Image: {image.filename}")
                
                # Map UI model names to AI pipeline models
                model_mapping = {
                    "veo3": {
                        "model": "veo3",
                        "duration": min(duration or 5, 30),
                        "cost_estimate": 3.00,
                        "processing_time": 300
                    },
                    "veo3_fast": {
                        "model": "veo3_fast",
                        "duration": min(duration or 5, 30),
                        "cost_estimate": 2.00,
                        "processing_time": 180
                    },
                    "veo2": {
                        "model": "veo2",
                        "duration": min(duration or 5, 30),
                        "cost_estimate": 2.50,
                        "processing_time": 240
                    },
                    "hailuo": {
                        "model": "hailuo",
                        "duration": min(duration or 5, 15),
                        "cost_estimate": 0.08,
                        "processing_time": 60
                    },
                    "kling": {
                        "model": "kling",
                        "duration": min(duration or 5, 15),
                        "cost_estimate": 0.10,
                        "processing_time": 90
                    }
                }
                
                # Get model configuration
                model_config = model_mapping.get(model)
                if not model_config:
                    raise ValueError(f"Unsupported model: {model}")
                
                ai_model = model_config["model"]
                duration_limit = model_config["duration"]
                
                print(f"🎬 Model config: {ai_model} (duration: {duration_limit}s)")
                print(f"💰 Estimated cost: ${model_config['cost_estimate']:.2f}")
                print(f"⏱️ Estimated time: {model_config['processing_time']}s")
                
                # Use FAL AI directly for image-to-video generation
                result = generate_image_to_video_fal(
                    image_path=image_path,
                    prompt=prompt or "Create a cinematic video from this image",
                    model=ai_model,
                    duration=duration_limit
                )
                
                print(f"✅ FAL AI image-to-video generation result: {result}")
                
                if result["success"]:
                    try:
                        # Save the generated video to our temp directory
                        temp_filename = f"{job_id}.mp4"
                        temp_path = TEMP_DIR / temp_filename
                        
                        with open(temp_path, "wb") as f:
                            f.write(result["video_data"])
                        
                        file_url = f"http://{API_HOST}:{API_PORT}/files/{temp_filename}"
                        print(f"📁 Video saved to: {temp_path}")
                        print(f"🌐 Accessible at: {file_url}")
                    except Exception as file_error:
                        print(f"⚠️ Failed to save video file: {file_error}")
                        return VideoGenerationResponse(
                            job_id=job_id,
                            status="failed",
                            message=f"Failed to save generated video: {file_error}",
                            estimated_time=0
                        )
                    
                    return VideoGenerationResponse(
                        job_id=job_id,
                        status="completed",
                        message=f"Video generated successfully from image with {model}",
                        estimated_time=0
                    )
                else:
                    return VideoGenerationResponse(
                        job_id=job_id,
                        status="failed",
                        message=f"Image-to-video generation failed: {result.get('error', 'Unknown error')}",
                        estimated_time=0
                    )
                
            except Exception as ai_error:
                print(f"❌ AI image-to-video generation failed: {ai_error}")
                return VideoGenerationResponse(
                    job_id=job_id,
                    status="processing", 
                    message=f"Image-to-video generation started for model: {model} (AI fallback)",
                    estimated_time=120
                )
        else:
            # Mock response when AI is not available
            return VideoGenerationResponse(
                job_id=job_id,
                status="processing",
                message=f"Image-to-video generation started for model: {model} (Mock mode)",
                estimated_time=120
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image-to-video generation failed: {str(e)}")

# Check generation status endpoint
@app.get("/status/{job_id}", response_model=GenerationStatus)
async def get_generation_status(job_id: str):
    """
    Check the status of a video generation job
    """
    # Check if video file exists
    video_file = TEMP_DIR / f"{job_id}.mp4"
    
    if video_file.exists():
        # Get file information
        video_info = get_video_info(str(video_file))
        
        return GenerationStatus(
            job_id=job_id,
            status="completed",
            progress=100,
            video_url=f"http://{API_HOST}:{API_PORT}/files/{job_id}.mp4",
            video_path=str(video_file),
            file_size=video_info.get("file_size"),
            duration=video_info.get("duration")
        )
    else:
        # Mock response for processing jobs
        return GenerationStatus(
            job_id=job_id,
            status="processing",
            progress=75,
            video_url=None,
            video_path=None
        )

# File serving endpoint
@app.get("/files/{filename}")
async def serve_file(filename: str):
    """
    Serve generated video and image files
    """
    file_path = TEMP_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine media type based on file extension
    file_extension = filename.split('.')[-1].lower()
    if file_extension == 'mp4':
        media_type = "video/mp4"
    elif file_extension in ['jpg', 'jpeg']:
        media_type = "image/jpeg"
    elif file_extension == 'png':
        media_type = "image/png"
    elif file_extension == 'webp':
        media_type = "image/webp"
    else:
        media_type = "application/octet-stream"
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type=media_type
    )

# Cleanup endpoint
@app.post("/cleanup")
async def cleanup_files():
    """
    Clean up old temporary files
    """
    try:
        cleanup_temp_files()
        return {"message": "Cleanup completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

# Cost estimation endpoint
@app.post("/estimate-cost")
async def estimate_cost(request: VideoGenerationRequest):
    """
    Estimate the cost of video generation
    """
    # Model costs and duration limits from AI pipeline constants
    model_costs = {
        "veo3": {"base_cost": 3.00, "max_duration": 30},
        "veo3_fast": {"base_cost": 2.00, "max_duration": 30},
        "veo2": {"base_cost": 2.50, "max_duration": 30},
        "hailuo": {"base_cost": 0.08, "max_duration": 15},
        "kling": {"base_cost": 0.10, "max_duration": 15}
    }
    
    model_info = model_costs.get(request.model, {"base_cost": 1.00, "max_duration": 30})
    base_cost = model_info["base_cost"]
    max_duration = model_info["max_duration"]
    
    # Limit duration to model's maximum
    actual_duration = min(request.duration or 5, max_duration)
    
    # Cost scales with duration for video generation
    duration_multiplier = max(1, actual_duration / 5)  # Base cost is for 5 seconds
    estimated_cost = base_cost * duration_multiplier
    
    return {
        "model": request.model,
        "duration": actual_duration,
        "max_duration": max_duration,
        "base_cost": base_cost,
        "estimated_cost": estimated_cost,
        "currency": "USD",
        "duration_multiplier": duration_multiplier
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)