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

export const TEXT2IMAGE_MODELS: Record<string, Text2ImageModel> = {
  "imagen4-ultra": {
    id: "imagen4-ultra",
    name: "Imagen4 Ultra",
    description: "Google's latest high-quality model with exceptional photorealism",
    provider: "Google",
    endpoint: "https://fal.run/fal-ai/imagen4/preview/ultra",
    
    qualityRating: 5,
    speedRating: 3,
    
    estimatedCost: "$0.08-0.12",
    costPerImage: 10, // cents
    
    maxResolution: "2048x2048",
    supportedAspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    
    defaultParams: {
      aspect_ratio: "1:1",
      num_images: 1,
    },
    
    availableParams: [
      {
        name: "aspect_ratio",
        type: "select",
        options: ["1:1", "4:3", "3:4", "16:9", "9:16"],
        default: "1:1",
        description: "Image aspect ratio",
      },
      {
        name: "num_images",
        type: "number",
        min: 1,
        max: 4,
        default: 1,
        description: "Number of images to generate",
      },
    ],
    
    bestFor: [
      "Photorealistic images",
      "Product photography",
      "Architectural visualization",
      "Nature and landscapes",
      "Portrait photography",
    ],
    
    strengths: [
      "Exceptional photorealism",
      "Excellent prompt adherence",
      "High detail and clarity",
      "Natural lighting and shadows",
      "Advanced understanding of complex prompts",
    ],
    
    limitations: [
      "Slower generation time",
      "Higher cost per image",
      "May struggle with highly stylized art",
      "Limited creative interpretation",
    ],
  },

  "seeddream-v3": {
    id: "seeddream-v3",
    name: "SeedDream v3",
    description: "ByteDance's creative model optimized for artistic and stylized generation",
    provider: "ByteDance",
    endpoint: "https://fal.run/fal-ai/bytedance/seedream/v3/text-to-image",
    
    qualityRating: 4,
    speedRating: 5,
    
    estimatedCost: "$0.03-0.06",
    costPerImage: 4, // cents
    
    maxResolution: "1536x1536",
    supportedAspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    
    defaultParams: {
      guidance_scale: 2.5,
      num_images: 1,
    },
    
    availableParams: [
      {
        name: "image_size",
        type: "select",
        options: ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
        default: "square_hd",
        description: "Output image resolution and aspect ratio",
      },
      {
        name: "guidance_scale",
        type: "number", 
        min: 1,
        max: 10,
        default: 2.5,
        description: "Controls prompt alignment (1-10)",
      },
      {
        name: "num_images",
        type: "number",
        min: 1,
        max: 4,
        default: 1,
        description: "Number of images to generate",
      },
      {
        name: "seed",
        type: "number",
        min: 0,
        max: 2147483647,
        default: null,
        description: "Random seed for reproducible results",
      },
    ],
    
    bestFor: [
      "Artistic illustrations",
      "Concept art and design", 
      "Stylized portraits",
      "Creative interpretations",
      "Abstract and surreal art",
    ],
    
    strengths: [
      "Fast generation speed",
      "Creative and artistic output",
      "Good style transfer capabilities",
      "Cost-effective",
      "Excellent for iterative design",
    ],
    
    limitations: [
      "Less photorealistic than Imagen4",
      "May over-stylize realistic requests",
      "Lower maximum resolution", 
      "Sometimes inconsistent quality",
    ],
  },

  "flux-pro-v11-ultra": {
    id: "flux-pro-v11-ultra", 
    name: "FLUX Pro v1.1 Ultra",
    description: "Latest FLUX model with enhanced detail and professional versatility",
    provider: "Black Forest Labs",
    endpoint: "https://fal.run/fal-ai/flux-pro/v1.1-ultra",
    
    qualityRating: 4,
    speedRating: 4,
    
    estimatedCost: "$0.05-0.09",
    costPerImage: 7, // cents
    
    maxResolution: "2048x2048",
    supportedAspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"],
    
    defaultParams: {
      aspect_ratio: "16:9",
      num_images: 1,
      safety_tolerance: "2",
      enable_safety_checker: true,
    },
    
    availableParams: [
      {
        name: "aspect_ratio",
        type: "select",
        options: ["21:9", "16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16", "9:21"],
        default: "16:9",
        description: "Output image aspect ratio",
      },
      {
        name: "num_images",
        type: "number",
        min: 1,
        max: 4,
        default: 1,
        description: "Number of images to generate",
      },
      {
        name: "safety_tolerance",
        type: "select",
        options: ["1", "2", "3", "4", "5", "6"],
        default: "2",
        description: "Safety filtering tolerance (1=strict, 6=permissive)",
      },
      {
        name: "enable_safety_checker",
        type: "boolean", 
        default: true,
        description: "Enable content safety filtering",
      },
    ],
    
    bestFor: [
      "Professional content creation",
      "Versatile image generation", 
      "Balanced realism and creativity",
      "Commercial applications",
      "High-resolution outputs",
    ],
    
    strengths: [
      "Excellent balance of quality and speed",
      "Professional-grade output",
      "Versatile across many styles",
      "Good prompt understanding",
      "High maximum resolution",
    ],
    
    limitations: [
      "Not as creative as SeedDream",
      "Not as photorealistic as Imagen4",
      "Mid-range pricing",
      "May require prompt engineering",
    ],
  },
};

// Helper functions
export function getModelById(id: string): Text2ImageModel | undefined {
  return TEXT2IMAGE_MODELS[id];
}

export function getModelsByProvider(provider: string): Text2ImageModel[] {
  return Object.values(TEXT2IMAGE_MODELS).filter(
    (model) => model.provider === provider
  );
}

export function getModelsByQuality(minRating: number): Text2ImageModel[] {
  return Object.values(TEXT2IMAGE_MODELS).filter(
    (model) => model.qualityRating >= minRating
  );
}

export function getModelsBySpeed(minRating: number): Text2ImageModel[] {
  return Object.values(TEXT2IMAGE_MODELS).filter(
    (model) => model.speedRating >= minRating
  );
}

export function getCostRange(): { min: number; max: number } {
  const costs = Object.values(TEXT2IMAGE_MODELS).map(m => m.costPerImage);
  return {
    min: Math.min(...costs),
    max: Math.max(...costs),
  };
}

export function recommendModelsForPrompt(prompt: string): string[] {
  const lowercasePrompt = prompt.toLowerCase();
  
  // Simple keyword-based recommendations  
  if (
    lowercasePrompt.includes("photo") ||
    lowercasePrompt.includes("realistic") ||
    lowercasePrompt.includes("portrait") ||
    lowercasePrompt.includes("product")
  ) {
    return ["imagen4-ultra", "flux-pro-v11-ultra"];
  }
  
  if (
    lowercasePrompt.includes("art") ||
    lowercasePrompt.includes("artistic") ||
    lowercasePrompt.includes("style") ||
    lowercasePrompt.includes("creative") ||
    lowercasePrompt.includes("abstract")
  ) {
    return ["seeddream-v3", "flux-pro-v11-ultra"];
  }
  
  // Default recommendation for balanced use
  return ["flux-pro-v11-ultra", "seeddream-v3"];
}

export const MODEL_CATEGORIES = {
  PHOTOREALISTIC: ["imagen4-ultra"],
  ARTISTIC: ["seeddream-v3"], 
  VERSATILE: ["flux-pro-v11-ultra"],
  FAST: ["seeddream-v3"],
  HIGH_QUALITY: ["imagen4-ultra", "flux-pro-v11-ultra"],
  COST_EFFECTIVE: ["seeddream-v3"],
} as const;