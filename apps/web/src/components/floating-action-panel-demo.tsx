"use client"

import * as React from "react"
import {
  FloatingActionPanelRoot,
  FloatingActionPanelTrigger,
  FloatingActionPanelContent,
  FloatingActionPanelModelOption,
} from "@/components/ui/floating-action-panel"

export function FloatingActionPanelDemo() {
  const [selectedModel, setSelectedModel] = React.useState("imagen4-ultra")

  const models = [
    {
      id: "imagen4-ultra",
      name: "Imagen4 Ultra",
      description: "Google's latest high-quality model with exceptional photorealism",
      quality: 5,
      speed: 3,
      price: "$0.08-0.12",
    },
    {
      id: "dall-e-3",
      name: "DALL·E 3",
      description: "OpenAI's creative model with strong prompt adherence",
      quality: 4,
      speed: 4,
      price: "$0.04-0.08",
    },
    {
      id: "midjourney-v6",
      name: "Midjourney v6",
      description: "Artistic model excelling at stylized and creative imagery",
      quality: 5,
      speed: 2,
      price: "$0.10-0.15",
    },
    {
      id: "stable-diffusion-xl",
      name: "Stable Diffusion XL",
      description: "Open-source model with good balance of quality and speed",
      quality: 3,
      speed: 5,
      price: "$0.02-0.04",
    },
  ]

  return (
    <div className="flex min-h-[500px] items-center justify-center">
      <FloatingActionPanelRoot>
        {({ mode }) => (
          <>
            <FloatingActionPanelTrigger 
              mode="selection" 
              title="Select AI Model"
              className="bg-zinc-900 text-white hover:bg-zinc-800"
            >
              Select Model
            </FloatingActionPanelTrigger>

            <FloatingActionPanelContent className="w-[400px] p-0">
              {mode === "selection" && (
                <div className="p-2 space-y-2">
                  {models.map((model) => (
                    <FloatingActionPanelModelOption
                      key={model.id}
                      id={model.id}
                      name={model.name}
                      description={model.description}
                      quality={model.quality}
                      speed={model.speed}
                      price={model.price}
                      checked={selectedModel === model.id}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModel(model.id)
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </FloatingActionPanelContent>
          </>
        )}
      </FloatingActionPanelRoot>
    </div>
  )
}