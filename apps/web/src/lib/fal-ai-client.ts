import { TEXT2IMAGE_MODELS, type Text2ImageModel } from "./text2image-models";

// Types for API responses
interface FalImageResponse {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  timings?: Record<string, number>;
  seed?: number;
  has_nsfw_concepts?: boolean[];
}

interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  metadata?: {
    seed?: number;
    timings?: Record<string, number>;
    dimensions?: { width: number; height: number };
  };
}

export interface GenerationSettings {
  imageSize: string;
  seed?: number;
}

// Multi-model generation result
export type MultiModelGenerationResult = Record<string, GenerationResult>;

class FalAIClient {
  private apiKey: string | null = null;
  private baseUrl = "https://fal.run";

  constructor() {
    // API key will be set server-side or via environment
    this.apiKey = process.env.FAL_API_KEY || null;
  }

  private async makeRequest(
    endpoint: string,
    params: Record<string, any>
  ): Promise<FalImageResponse> {
    console.log("Making request to:", endpoint, "with params:", params);
    
    const response = await fetch(`/api/text2image/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint,
        params,
      }),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API request failed:", errorData);
      
      // Handle different error response formats
      let errorMessage = `API request failed: ${response.status}`;
      
      if (errorData.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (typeof errorData.error === 'object') {
          errorMessage = JSON.stringify(errorData.error, null, 2);
        }
      } else if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
        } else {
          errorMessage = JSON.stringify(errorData.detail, null, 2);
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("API response:", result);
    return result;
  }

  private convertSettingsToParams(
    model: Text2ImageModel,
    prompt: string,
    settings: GenerationSettings
  ): Record<string, any> {
    const params: Record<string, any> = {
      prompt,
      ...model.defaultParams,
    };

    // Add seed if provided
    if (settings.seed !== undefined && settings.seed !== null) {
      params.seed = settings.seed;
    }

    // Convert generic settings to model-specific parameters
    switch (model.id) {
      case "imagen4-ultra":
        // Imagen4 uses aspect_ratio - map from size format to aspect ratio
        switch (settings.imageSize) {
          case "square":
          case "square_hd":
            params.aspect_ratio = "1:1";
            break;
          case "portrait_4_3":
            params.aspect_ratio = "3:4";
            break;
          case "portrait_16_9":
            params.aspect_ratio = "9:16";
            break;
          case "landscape_4_3":
            params.aspect_ratio = "4:3";
            break;
          case "landscape_16_9":
            params.aspect_ratio = "16:9";
            break;
          default:
            params.aspect_ratio = "1:1";
        }
        break;

      case "seeddream-v3":
        // SeedDream v3 uses image_size (predefined values or custom)
        params.image_size = settings.imageSize;
        break;

      case "flux-pro-v11-ultra":
        // FLUX Pro uses aspect_ratio
        switch (settings.imageSize) {
          case "square":
          case "square_hd":
            params.aspect_ratio = "1:1";
            break;
          case "portrait_4_3":
            params.aspect_ratio = "3:4";
            break;
          case "portrait_16_9":
            params.aspect_ratio = "9:16";
            break;
          case "landscape_4_3":
            params.aspect_ratio = "4:3";
            break;
          case "landscape_16_9":
            params.aspect_ratio = "16:9";
            break;
          default:
            params.aspect_ratio = "16:9"; // Default for FLUX
        }
        break;
    }

    return params;
  }

  async generateWithModel(
    modelKey: string,
    prompt: string,
    settings: GenerationSettings
  ): Promise<GenerationResult> {
    try {
      const model = TEXT2IMAGE_MODELS[modelKey];
      if (!model) {
        throw new Error(`Unknown model: ${modelKey}`);
      }

      const params = this.convertSettingsToParams(model, prompt, settings);
      
      console.log(`Generating with ${model.name}:`, { prompt, params });

      const response = await this.makeRequest(model.endpoint, params);

      if (!response.images || response.images.length === 0) {
        throw new Error("No images returned from API");
      }

      const image = response.images[0];
      
      return {
        success: true,
        imageUrl: image.url,
        metadata: {
          seed: response.seed,
          timings: response.timings,
          dimensions: {
            width: image.width,
            height: image.height,
          },
        },
      };
    } catch (error) {
      console.error(`Generation failed for ${modelKey}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async generateWithMultipleModels(
    modelKeys: string[],
    prompt: string,
    settings: GenerationSettings
  ): Promise<MultiModelGenerationResult> {
    console.log(`Starting multi-model generation with ${modelKeys.length} models:`, modelKeys);

    // Create promises for all model generations
    const generationPromises = modelKeys.map(async (modelKey) => {
      const result = await this.generateWithModel(modelKey, prompt, settings);
      return [modelKey, result] as [string, GenerationResult];
    });

    try {
      // Wait for all generations to complete (or fail)
      const results = await Promise.allSettled(generationPromises);
      
      const finalResults: MultiModelGenerationResult = {};
      
      results.forEach((result, index) => {
        const modelKey = modelKeys[index];
        
        if (result.status === "fulfilled") {
          finalResults[modelKey] = result.value[1];
        } else {
          console.error(`Model ${modelKey} generation rejected:`, result.reason);
          finalResults[modelKey] = {
            success: false,
            error: result.reason instanceof Error 
              ? result.reason.message 
              : "Generation failed",
          };
        }
      });

      return finalResults;
    } catch (error) {
      console.error("Multi-model generation failed:", error);
      
      // Return error results for all models
      const errorResults: MultiModelGenerationResult = {};
      modelKeys.forEach((modelKey) => {
        errorResults[modelKey] = {
          success: false,
          error: error instanceof Error ? error.message : "Multi-model generation failed",
        };
      });
      
      return errorResults;
    }
  }

  // Utility methods
  async testModelAvailability(modelKey: string): Promise<boolean> {
    try {
      const model = TEXT2IMAGE_MODELS[modelKey];
      if (!model) return false;

      // Test with a simple prompt
      const result = await this.generateWithModel(
        modelKey,
        "test image",
        { imageSize: "square" }
      );

      return result.success;
    } catch {
      return false;
    }
  }

  async estimateGenerationTime(
    modelKeys: string[],
    prompt: string
  ): Promise<Record<string, number>> {
    const estimates: Record<string, number> = {};
    
    modelKeys.forEach((modelKey) => {
      const model = TEXT2IMAGE_MODELS[modelKey];
      if (model) {
        // Rough estimation based on model speed rating and prompt complexity
        const baseTime = 15; // seconds
        const speedMultiplier = (6 - model.speedRating) * 0.5; // 0.5 to 2.5
        const promptComplexity = Math.min(prompt.split(" ").length / 10, 2); // 0 to 2
        
        estimates[modelKey] = Math.round(baseTime * speedMultiplier * (1 + promptComplexity));
      }
    });
    
    return estimates;
  }

  async getModelCapabilities(modelKey: string): Promise<{
    available: boolean;
    maxResolution: string;
    estimatedCost: string;
    features: string[];
  } | null> {
    const model = TEXT2IMAGE_MODELS[modelKey];
    if (!model) return null;

    return {
      available: true, // Would check with actual API in real implementation
      maxResolution: model.maxResolution,
      estimatedCost: model.estimatedCost,
      features: model.strengths,
    };
  }
}

// Export singleton instance
export const falAIClient = new FalAIClient();

// Export main functions for easy importing
export async function generateWithModel(
  modelKey: string,
  prompt: string,
  settings: GenerationSettings
): Promise<GenerationResult> {
  return falAIClient.generateWithModel(modelKey, prompt, settings);
}

export async function generateWithMultipleModels(
  modelKeys: string[],
  prompt: string,
  settings: GenerationSettings
): Promise<MultiModelGenerationResult> {
  return falAIClient.generateWithMultipleModels(modelKeys, prompt, settings);
}

export async function testModelAvailability(modelKey: string): Promise<boolean> {
  return falAIClient.testModelAvailability(modelKey);
}

export async function estimateGenerationTime(
  modelKeys: string[],
  prompt: string
): Promise<Record<string, number>> {
  return falAIClient.estimateGenerationTime(modelKeys, prompt);
}

// Helper function to batch requests with rate limiting
export async function batchGenerate(
  requests: Array<{
    modelKey: string;
    prompt: string;
    settings: GenerationSettings;
  }>,
  options: {
    concurrency?: number;
    delayBetweenBatches?: number;
  } = {}
): Promise<Array<{ request: typeof requests[0]; result: GenerationResult }>> {
  const { concurrency = 3, delayBetweenBatches = 1000 } = options;
  const results: Array<{ request: typeof requests[0]; result: GenerationResult }> = [];
  
  // Process requests in batches
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (request) => {
      const result = await generateWithModel(
        request.modelKey,
        request.prompt,
        request.settings
      );
      return { request, result };
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((settledResult) => {
      if (settledResult.status === "fulfilled") {
        results.push(settledResult.value);
      } else {
        // Handle rejected batch item
        console.error("Batch generation item failed:", settledResult.reason);
      }
    });
    
    // Delay between batches to respect rate limits
    if (i + concurrency < requests.length && delayBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}