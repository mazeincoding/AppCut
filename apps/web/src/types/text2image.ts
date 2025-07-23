// Text2Image model types
export interface Text2ImageModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  endpoint: string;
  
  // Quality indicators (1-5 scale)
  qualityRating: number;
  speedRating: number;
  
  // Cost information
  estimatedCost: string;
  costPerImage: number; // in credits/cents
  
  // Technical specifications
  maxResolution: string;
  supportedAspectRatios: string[];
  
  // Model-specific parameters
  defaultParams: Record<string, any>;
  availableParams: Array<{
    name: string;
    type: "number" | "string" | "boolean" | "select";
    min?: number;
    max?: number;
    options?: string[];
    default: any;
    description: string;
  }>;
  
  // Use case recommendations
  bestFor: string[];
  strengths: string[];
  limitations: string[];
}

// Generation request/response types
export interface GenerationRequest {
  modelKey: string;
  prompt: string;
  settings: GenerationSettings;
}

export interface GenerationSettings {
  imageSize: string;
  seed?: number;
  // Model-specific settings will be added dynamically
  [key: string]: any;
}

export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  metadata?: {
    seed?: number;
    timings?: Record<string, number>;
    dimensions?: { width: number; height: number };
    modelUsed?: string;
    promptUsed?: string;
  };
}

export type MultiModelGenerationResult = Record<string, GenerationResult>;

// Store types
export interface SelectedResult {
  modelKey: string;
  imageUrl: string;
  prompt: string;
  settings: GenerationSettings;
}

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  models: string[];
  results: Record<string, GenerationResult>;
  createdAt: Date;
}

// API types
export interface FalImageResponse {
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

export interface FalErrorResponse {
  detail?: string;
  error?: string;
  message?: string;
}

// UI Component types
export type GenerationMode = "single" | "multi";

export interface ModelSelectionState {
  selectedModels: string[];
  generationMode: GenerationMode;
}

export interface GenerationState {
  isGenerating: boolean;
  generationResults: Record<string, {
    status: "loading" | "success" | "error";
    imageUrl?: string;
    error?: string;
    generatedAt?: Date;
  }>;
}

// Utility types
export type ModelCategory = 
  | "PHOTOREALISTIC"
  | "ARTISTIC" 
  | "VERSATILE"
  | "FAST"
  | "HIGH_QUALITY"
  | "COST_EFFECTIVE";

export interface ModelRecommendation {
  modelKey: string;
  confidence: number; // 0-1
  reason: string;
}

export interface BatchGenerationRequest {
  requests: GenerationRequest[];
  options?: {
    concurrency?: number;
    delayBetweenBatches?: number;
  };
}

export interface BatchGenerationResult {
  request: GenerationRequest;
  result: GenerationResult;
}

// Media integration types
export interface GeneratedMediaItem {
  id: string;
  url: string;
  type: "image";
  name: string;
  size: number;
  duration: 0;
  metadata: {
    source: "text2image";
    model: string;
    prompt: string;
    settings: GenerationSettings;
    generatedAt: Date;
  };
}

// Performance and analytics types
export interface ModelPerformanceMetrics {
  modelKey: string;
  averageGenerationTime: number;
  successRate: number; // 0-1
  totalGenerations: number;
  lastUsed: Date;
}

export interface GenerationAnalytics {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageGenerationTime: number;
  mostUsedModel: string;
  modelUsageStats: Record<string, number>;
  costAnalysis: {
    totalCost: number;
    averageCostPerGeneration: number;
  };
}

// Error types
export interface Text2ImageError extends Error {
  code?: string;
  modelKey?: string;
  prompt?: string;
  details?: Record<string, any>;
}

export class Text2ImageApiError extends Error implements Text2ImageError {
  constructor(
    message: string,
    public code?: string,
    public modelKey?: string,
    public prompt?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "Text2ImageApiError";
  }
}

export class Text2ImageValidationError extends Error implements Text2ImageError {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "Text2ImageValidationError";
  }
}

// Configuration types
export interface Text2ImageConfig {
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  retryConfig: {
    maxRetries: number;
    backoffFactor: number;
    maxBackoffTime: number;
  };
}

// Export utility type guards
export function isGenerationResult(obj: any): obj is GenerationResult {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.success === "boolean"
  );
}

export function isMultiModelResult(obj: any): obj is MultiModelGenerationResult {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Object.values(obj).every(isGenerationResult)
  );
}

export function isText2ImageModel(obj: any): obj is Text2ImageModel {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.endpoint === "string"
  );
}