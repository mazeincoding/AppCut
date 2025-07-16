/**
 * AI Video Generation Client
 * Handles communication with the Python FastAPI backend
 */

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com'  // Update with production URL
  : 'http://localhost:8000';

export interface VideoGenerationRequest {
  prompt: string;
  model: string;
  resolution?: string;
  duration?: number;
}

export interface VideoGenerationResponse {
  job_id: string;
  status: string;
  message: string;
  estimated_time?: number;
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
 * Generate an AI video from a text prompt
 */
export async function generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  }
}

/**
 * Check the status of a video generation job
 */
export async function getGenerationStatus(jobId: string): Promise<GenerationStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/status/${jobId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking generation status:', error);
    throw error;
  }
}

/**
 * Get available AI models
 */
export async function getAvailableModels(): Promise<ModelsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/models`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
}

/**
 * Estimate the cost of video generation
 */
export async function estimateCost(request: VideoGenerationRequest): Promise<CostEstimate> {
  try {
    const response = await fetch(`${API_BASE_URL}/estimate-cost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error estimating cost:', error);
    throw error;
  }
}

/**
 * Check if the API server is healthy
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking API health:', error);
    throw error;
  }
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
 * Utility function to check if the API is available
 */
export async function isApiAvailable(): Promise<boolean> {
  try {
    await checkHealth();
    return true;
  } catch {
    return false;
  }
}