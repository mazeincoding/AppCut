/**
 * Image Editing API Client for FAL.ai Models
 * Supports SeedEdit v3, FLUX Pro Kontext, and FLUX Pro Kontext Max
 */

const FAL_API_KEY = process.env.NEXT_PUBLIC_FAL_API_KEY;
const FAL_API_BASE = 'https://fal.run';

export interface ImageEditRequest {
  imageUrl: string;
  prompt: string;
  model: 'seededit' | 'flux-kontext' | 'flux-kontext-max';
  guidanceScale?: number;
  steps?: number;
  seed?: number;
  safetyTolerance?: number;
  numImages?: number;
}

export interface ImageEditResponse {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  result_url?: string;
  seed_used?: number;
  processing_time?: number;
}

export type ImageEditProgressCallback = (status: {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  elapsedTime?: number;
  estimatedTime?: number;
}) => void;

interface ModelEndpoint {
  endpoint: string;
  defaultParams: Record<string, any>;
}

const MODEL_ENDPOINTS: Record<string, ModelEndpoint> = {
  'seededit': {
    endpoint: 'fal-ai/bytedance/seededit/v3/edit-image',
    defaultParams: {
      guidance_scale: 1.0,
    }
  },
  'flux-kontext': {
    endpoint: 'fal-ai/flux-pro/kontext',
    defaultParams: {
      guidance_scale: 3.5,
      num_inference_steps: 28,
      safety_tolerance: 2,
      num_images: 1
    }
  },
  'flux-kontext-max': {
    endpoint: 'fal-ai/flux-pro/kontext/max',
    defaultParams: {
      guidance_scale: 3.5,
      num_inference_steps: 28,
      safety_tolerance: 2,
      num_images: 1
    }
  }
};

/**
 * Upload image to FAL.ai and get URL
 */
export async function uploadImageToFAL(imageFile: File): Promise<string> {
  if (!FAL_API_KEY) {
    throw new Error('FAL API key not configured');
  }

  // Convert image to base64 data URL as fallback since FAL storage upload might not be available
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        console.log('✅ Image converted to base64 data URL for FAL API');
        resolve(reader.result as string);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(imageFile);
  });

  // Alternative: Try FAL storage upload (commented out until we confirm the endpoint)
  /*
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(`${FAL_API_BASE}/storage/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.warn('FAL storage upload failed, falling back to base64:', errorData);
      // Fall back to base64
      return imageToBase64(imageFile);
    }

    const result = await response.json();
    return result.url;
  } catch (error) {
    console.warn('FAL storage upload error, using base64 fallback:', error);
    return imageToBase64(imageFile);
  }
  */
}

/**
 * Edit image using specified model
 */
export async function editImage(
  request: ImageEditRequest,
  onProgress?: ImageEditProgressCallback
): Promise<ImageEditResponse> {
  if (!FAL_API_KEY) {
    throw new Error('FAL API key not configured');
  }

  const modelConfig = MODEL_ENDPOINTS[request.model];
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${request.model}`);
  }

  const startTime = Date.now();
  const jobId = generateJobId();

  // Build request payload
  let payload: any = {
    prompt: request.prompt,
    image_url: request.imageUrl,
    ...modelConfig.defaultParams
  };

  // Override with user-specified parameters
  if (request.guidanceScale !== undefined) {
    payload.guidance_scale = request.guidanceScale;
  }
  if (request.steps !== undefined) {
    payload.num_inference_steps = request.steps;
  }
  if (request.seed !== undefined) {
    payload.seed = request.seed;
  }
  if (request.safetyTolerance !== undefined) {
    payload.safety_tolerance = request.safetyTolerance;
  }
  if (request.numImages !== undefined) {
    payload.num_images = request.numImages;
  }

  console.log(`🎨 Editing image with ${request.model}:`, {
    ...payload,
    image_url: payload.image_url?.substring(0, 50) + '...' // Truncate for readability
  });

  if (onProgress) {
    onProgress({
      status: 'queued',
      progress: 0,
      message: 'Submitting to FAL.ai...',
      elapsedTime: 0
    });
  }

  try {
    // Try queue mode first
    const response = await fetch(`${FAL_API_BASE}/${modelConfig.endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Fal-Queue': 'true',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('FAL API Error:', errorData);
      
      // Handle content policy violations (422 errors) with user-friendly messages
      if (response.status === 422 && errorData.detail && Array.isArray(errorData.detail)) {
        const contentPolicyError = errorData.detail.find(
          (error: any) => error.type === 'content_policy_violation'
        );
        
        if (contentPolicyError) {
          throw new Error('Content policy violation: Please use appropriate language for image descriptions');
        }
      }
      
      // Handle other error types with original logic
      const errorMessage = errorData.detail 
        ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail))
        : errorData.message || response.statusText;
      throw new Error(`API error: ${response.status} - ${errorMessage}`);
    }

    const result = await response.json();
    console.log('✅ FAL API response:', JSON.stringify(result, null, 2));

    // Check if we got a direct result or need to poll
    if (result.request_id) {
      // Queue mode - poll for results
      console.log('📋 Using queue mode with request_id:', result.request_id);
      return await pollImageEditStatus(result.request_id, modelConfig.endpoint, startTime, onProgress, jobId, request.model);
    } else if (result.images && result.images.length > 0) {
      // Direct mode - return immediately
      console.log('🎯 Using direct mode with images:', result.images.length);
      if (onProgress) {
        onProgress({
          status: 'completed',
          progress: 100,
          message: 'Image editing completed!',
          elapsedTime: Math.floor((Date.now() - startTime) / 1000)
        });
      }

      return {
        job_id: jobId,
        status: 'completed',
        message: 'Image edited successfully',
        result_url: result.images[0].url,
        seed_used: result.seed,
        processing_time: Math.floor((Date.now() - startTime) / 1000)
      };
    } else if (result.image && result.image.url) {
      // Alternative direct mode format - single image object
      console.log('🎯 Using direct mode with single image object');
      if (onProgress) {
        onProgress({
          status: 'completed',
          progress: 100,
          message: 'Image editing completed!',
          elapsedTime: Math.floor((Date.now() - startTime) / 1000)
        });
      }

      return {
        job_id: jobId,
        status: 'completed',
        message: 'Image edited successfully',
        result_url: result.image.url,
        seed_used: result.seed,
        processing_time: Math.floor((Date.now() - startTime) / 1000)
      };
    } else if (result.url) {
      // Alternative direct mode format - URL at root level
      console.log('🎯 Using direct mode with root URL');
      if (onProgress) {
        onProgress({
          status: 'completed',
          progress: 100,
          message: 'Image editing completed!',
          elapsedTime: Math.floor((Date.now() - startTime) / 1000)
        });
      }

      return {
        job_id: jobId,
        status: 'completed',
        message: 'Image edited successfully',
        result_url: result.url,
        seed_used: result.seed,
        processing_time: Math.floor((Date.now() - startTime) / 1000)
      };
    } else {
      console.error('❌ Unexpected API response structure:', {
        hasRequestId: !!result.request_id,
        hasImages: !!result.images,
        hasImageObject: !!result.image,
        hasUrlRoot: !!result.url,
        keys: Object.keys(result),
        result: result
      });
      throw new Error(`Unexpected response format from FAL API. Response keys: ${Object.keys(result).join(', ')}`);
    }
  } catch (error) {
    if (onProgress) {
      onProgress({
        status: 'failed',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        elapsedTime: Math.floor((Date.now() - startTime) / 1000)
      });
    }
    throw error;
  }
}

/**
 * Poll for image edit status
 */
async function pollImageEditStatus(
  requestId: string,
  endpoint: string,
  startTime: number,
  onProgress?: ImageEditProgressCallback,
  jobId?: string,
  modelName?: string
): Promise<ImageEditResponse> {
  const maxAttempts = 30; // 2.5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);

    try {
      const statusResponse = await fetch(`${FAL_API_BASE}/queue/requests/${requestId}/status`, {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.warn(`Status check failed (attempt ${attempts}):`, statusResponse.status);
        await sleep(5000);
        continue;
      }

      const status = await statusResponse.json();
      console.log(`📊 Edit status (${elapsedTime}s):`, status);

      if (onProgress) {
        const progressUpdate = mapEditStatusToProgress(status, elapsedTime);
        onProgress(progressUpdate);
      }

      if (status.status === 'COMPLETED') {
        const resultResponse = await fetch(`${FAL_API_BASE}/queue/requests/${requestId}`, {
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
          },
        });

        if (resultResponse.ok) {
          const result = await resultResponse.json();
          console.log('✅ Edit completed:', result);

          if (onProgress) {
            onProgress({
              status: 'completed',
              progress: 100,
              message: `Image edited successfully with ${modelName}`,
              elapsedTime: elapsedTime
            });
          }

          return {
            job_id: jobId || requestId,
            status: 'completed',
            message: `Image edited successfully with ${modelName}`,
            result_url: result.images?.[0]?.url || result.image?.url,
            seed_used: result.seed,
            processing_time: elapsedTime
          };
        }
      }

      if (status.status === 'FAILED') {
        const errorMessage = status.error || 'Image editing failed';
        if (onProgress) {
          onProgress({
            status: 'failed',
            progress: 0,
            message: errorMessage,
            elapsedTime: elapsedTime
          });
        }
        throw new Error(errorMessage);
      }

      await sleep(5000);
    } catch (error) {
      console.error(`Status polling error (attempt ${attempts}):`, error);
      if (attempts >= maxAttempts) {
        throw new Error('Image editing timeout');
      }
      await sleep(5000);
    }
  }

  throw new Error('Maximum polling attempts reached');
}

function mapEditStatusToProgress(status: any, elapsedTime: number) {
  const baseUpdate = { elapsedTime };

  switch (status.status) {
    case 'IN_QUEUE':
      return {
        ...baseUpdate,
        status: 'queued' as const,
        progress: 10,
        message: `Queued (position: ${status.queue_position || 'unknown'})`,
        estimatedTime: status.estimated_time
      };
    case 'IN_PROGRESS':
      return {
        ...baseUpdate,
        status: 'processing' as const,
        progress: Math.min(90, 20 + (elapsedTime * 3)),
        message: 'Processing image...',
        estimatedTime: status.estimated_time
      };
    case 'COMPLETED':
      return {
        ...baseUpdate,
        status: 'completed' as const,
        progress: 100,
        message: 'Image editing completed!'
      };
    case 'FAILED':
      return {
        ...baseUpdate,
        status: 'failed' as const,
        progress: 0,
        message: status.error || 'Processing failed'
      };
    default:
      return {
        ...baseUpdate,
        status: 'processing' as const,
        progress: 5,
        message: `Status: ${status.status}`
      };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateJobId(): string {
  return 'edit_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Get model information
 */
export function getImageEditModels() {
  return [
    {
      id: 'seededit',
      name: 'SeedEdit v3',
      description: 'Precise photo editing with content preservation',
      provider: 'ByteDance',
      estimatedCost: '$0.05-0.10',
      features: ['Photo retouching', 'Object modification', 'Realistic edits'],
      parameters: {
        guidanceScale: { min: 1, max: 10, default: 1.0, step: 0.1 },
        seed: { optional: true }
      }
    },
    {
      id: 'flux-kontext',
      name: 'FLUX Pro Kontext',
      description: 'Context-aware editing with scene transformations',
      provider: 'FLUX',
      estimatedCost: '$0.15-0.25',
      features: ['Style changes', 'Object replacement', 'Scene modification'],
      parameters: {
        guidanceScale: { min: 1, max: 20, default: 3.5, step: 0.5 },
        steps: { min: 1, max: 50, default: 28, step: 1 },
        safetyTolerance: { min: 1, max: 6, default: 2, step: 1 },
        numImages: { min: 1, max: 4, default: 1, step: 1 }
      }
    },
    {
      id: 'flux-kontext-max',
      name: 'FLUX Pro Kontext Max',
      description: 'Advanced editing for complex tasks and typography',
      provider: 'FLUX',
      estimatedCost: '$0.25-0.40',
      features: ['Complex edits', 'Typography', 'Professional adjustments'],
      parameters: {
        guidanceScale: { min: 1, max: 20, default: 3.5, step: 0.5 },
        steps: { min: 1, max: 50, default: 28, step: 1 },
        safetyTolerance: { min: 1, max: 6, default: 2, step: 1 },
        numImages: { min: 1, max: 4, default: 1, step: 1 }
      }
    }
  ];
}