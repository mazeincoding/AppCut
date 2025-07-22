/**
 * AI Video Generation Client
 * Handles communication with the Python FastAPI backend
 */

// Direct FAL AI integration - no backend needed
const FAL_API_KEY = process.env.NEXT_PUBLIC_FAL_API_KEY;
const FAL_API_BASE = 'https://fal.run';

export interface VideoGenerationRequest {
  prompt: string;
  model: string;
  resolution?: string;
  duration?: number;
}

export interface ImageToVideoRequest {
  image: File;
  model: string;
  prompt?: string;
  resolution?: string;
  duration?: number;
}

export interface VideoGenerationResponse {
  job_id: string;
  status: string;
  message: string;
  estimated_time?: number;
  video_url?: string;
  video_data?: any;
}

export interface GenerationStatus {
  job_id: string;
  status: string;
  progress?: number;
  video_url?: string;
  error?: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  price: string;
  resolution: string;
  max_duration: number;
}

export interface ModelsResponse {
  models: AIModel[];
}

export interface CostEstimate {
  model: string;
  duration: number;
  base_cost: number;
  estimated_cost: number;
  currency: string;
}

/**
 * Generate an AI video from a text prompt using FAL AI directly
 */
export async function generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  try {
    if (!FAL_API_KEY) {
      throw new Error('FAL API key not configured');
    }

    // Map our model names to FAL endpoints
    const modelEndpoints: { [key: string]: string } = {
      'veo3': 'fal-ai/google/veo3',
      'veo3_fast': 'fal-ai/google/veo3/fast',
      'veo2': 'fal-ai/google/veo2', 
      'hailuo': 'fal-ai/minimax/hailuo-02/standard/text-to-video',
      'kling': 'fal-ai/bytedance/kling-video/v1.5/pro',
      'kling_v2': 'fal-ai/kling-video/v2.1/master'
    };

    const endpoint = modelEndpoints[request.model] || 'fal-ai/minimax/hailuo-02/standard/text-to-video';
    const jobId = generateJobId();

    console.log(`🎬 Generating video with FAL AI: ${endpoint}`);
    console.log(`📝 Prompt: ${request.prompt}`);

    const response = await fetch(`${FAL_API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        duration: request.duration || 5,
        resolution: request.resolution || '1080p'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `FAL API error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ FAL API response:', result);

    // Return in our expected format
    return {
      job_id: jobId,
      status: 'completed',
      message: `Video generated successfully with ${request.model}`,
      estimated_time: 0,
      video_url: result.video?.url || result.video,
      video_data: result
    };
  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  }
}

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return 'job_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Convert image file to base64 data URL (alternative to uploading)
 */
async function imageToDataURL(imageFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Generate an AI video from an image using FAL AI directly
 */
export async function generateVideoFromImage(request: ImageToVideoRequest): Promise<VideoGenerationResponse> {
  try {
    if (!FAL_API_KEY) {
      throw new Error('FAL API key not configured');
    }

    console.log('🤖 Starting image-to-video generation with FAL AI');
    console.log('📝 Prompt:', request.prompt || 'No additional prompt');
    console.log('🖼️ Image:', request.image.name);

    // 1. Convert image to base64 data URL
    console.log('📤 Converting image to base64...');
    const imageUrl = await imageToDataURL(request.image);
    console.log('✅ Image converted to data URL');

    // 2. Generate video - choose endpoint based on model
    let endpoint: string;
    let payload: any;
    
    if (request.model === 'kling_v2') {
      // Use dedicated Kling v2.1 image-to-video endpoint
      endpoint = 'fal-ai/kling-video/v2.1/master/image-to-video';
      payload = {
        prompt: request.prompt || 'Create a cinematic video from this image',
        image_url: imageUrl,
        duration: request.duration || 5,
        cfg_scale: 0.5 // Default for good prompt adherence
      };
    } else {
      // Use Seedance model for other cases (proven to work)
      endpoint = 'fal-ai/bytedance/seedance/v1/pro/image-to-video';
      payload = {
        prompt: request.prompt || 'Create a cinematic video from this image',
        image_url: imageUrl,
        resolution: request.resolution || '1080p',
        duration: request.duration?.toString() || '5'
      };
    }
    
    const jobId = generateJobId();
    console.log(`🎬 Generating video with: ${endpoint}`);
    console.log(`📝 Payload:`, payload);

    const response = await fetch(`${FAL_API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle specific error cases with user-friendly messages
      if (errorData.detail && errorData.detail.includes('User is locked')) {
        if (errorData.detail.includes('Exhausted balance')) {
          throw new Error('Your FAL.ai account balance has been exhausted. Please top up your balance at fal.ai/dashboard/billing to continue generating videos.');
        }
        throw new Error('Your FAL.ai account is temporarily locked. Please check your account status at fal.ai/dashboard.');
      }
      
      if (response.status === 401) {
        throw new Error('Invalid FAL.ai API key. Please check your API key configuration.');
      }
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      }
      
      throw new Error(`FAL API error: ${errorData.detail || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ FAL API response:', result);

    // Return in our expected format
    return {
      job_id: jobId,
      status: 'completed',
      message: `Video generated successfully from image with ${request.model}`,
      estimated_time: 0,
      video_url: result.video?.url || result.video,
      video_data: result
    };
  } catch (error) {
    console.error('Error generating video from image:', error);
    throw error;
  }
}

/**
 * Check the status of a video generation job
 * Note: With direct FAL AI, videos are generated synchronously, so this is a simple mock
 */
export async function getGenerationStatus(jobId: string): Promise<GenerationStatus> {
  // Since we're doing direct FAL API calls, generation is synchronous
  // This function is kept for compatibility with existing UI polling logic
  return {
    job_id: jobId,
    status: 'completed',
    progress: 100,
    video_url: undefined, // Will be set by the actual generation response
    error: undefined
  };
}

/**
 * Get available AI models - now hardcoded since we know the FAL AI models
 */
export async function getAvailableModels(): Promise<ModelsResponse> {
  return {
    models: [
      {
        id: "veo3",
        name: "Veo3",
        description: "Highest quality, slower generation",
        price: "$3.00",
        resolution: "1080p",
        max_duration: 30
      },
      {
        id: "veo3_fast",
        name: "Veo3 Fast",
        description: "High quality, faster generation",
        price: "$2.00",
        resolution: "1080p",
        max_duration: 30
      },
      {
        id: "veo2",
        name: "Veo2",
        description: "Good quality, balanced speed",
        price: "$2.50",
        resolution: "1080p",
        max_duration: 30
      },
      {
        id: "hailuo",
        name: "Hailuo 02",
        description: "Ultra-realistic physics simulation, 768p quality",
        price: "$0.28",
        resolution: "768p",
        max_duration: 10
      },
      {
        id: "kling",
        name: "Kling v1.5",
        description: "Fast generation, cost-effective",
        price: "$0.10",
        resolution: "720p",
        max_duration: 15
      },
      {
        id: "kling_v2",
        name: "Kling v2.1",
        description: "Premium model with unparalleled motion fluidity",
        price: "$0.15",
        resolution: "1080p",
        max_duration: 10
      }
    ]
  };
}

/**
 * Estimate the cost of video generation - simplified for direct FAL AI
 */
export async function estimateCost(request: VideoGenerationRequest): Promise<CostEstimate> {
  const modelCosts: { [key: string]: { base_cost: number; max_duration: number } } = {
    "veo3": { base_cost: 3.00, max_duration: 30 },
    "veo3_fast": { base_cost: 2.00, max_duration: 30 },
    "veo2": { base_cost: 2.50, max_duration: 30 },
    "hailuo": { base_cost: 0.28, max_duration: 10 },
    "kling": { base_cost: 0.10, max_duration: 15 },
    "kling_v2": { base_cost: 0.15, max_duration: 10 }
  };

  const modelInfo = modelCosts[request.model] || { base_cost: 1.00, max_duration: 30 };
  const actualDuration = Math.min(request.duration || 5, modelInfo.max_duration);
  const durationMultiplier = Math.max(1, actualDuration / 5);
  const estimatedCost = modelInfo.base_cost * durationMultiplier;

  return {
    model: request.model,
    duration: actualDuration,
    base_cost: modelInfo.base_cost,
    estimated_cost: estimatedCost,
    currency: "USD"
  };
}

/**
 * Utility function to handle API errors consistently
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

/**
 * Check if FAL API is available
 */
export async function isApiAvailable(): Promise<boolean> {
  return !!FAL_API_KEY;
}