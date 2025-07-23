import { NextRequest, NextResponse } from "next/server";

interface GenerateRequest {
  endpoint: string;
  params: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { endpoint, params } = body;

    // Validate request
    if (!endpoint || !params || !params.prompt) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get API key from environment (try both possible names)
    const apiKey = process.env.FAL_API_KEY || process.env.NEXT_PUBLIC_FAL_API_KEY;
    if (!apiKey) {
      console.error("FAL_API_KEY not configured");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Extract model endpoint from full URL
    const modelPath = endpoint.replace("https://fal.run/", "");
    
    console.log(`Making request to Fal AI: ${modelPath}`, {
      prompt: params.prompt,
      paramCount: Object.keys(params).length
    });

    // Make request to Fal AI
    const response = await fetch(`https://fal.run/${modelPath}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Fal AI API error (${response.status}):`, errorText);
      
      let errorMessage = "Generation failed";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.error || errorMessage;
      } catch {
        errorMessage = `API error: ${response.status}`;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    console.log("Fal AI response:", {
      hasImages: !!result.images,
      imageCount: result.images?.length || 0,
      seed: result.seed,
      timings: result.timings
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error("Text2Image API error:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Internal server error";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}