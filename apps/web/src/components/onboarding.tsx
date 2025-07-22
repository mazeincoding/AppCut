"use client";

import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { ArrowRightIcon } from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenOnboarding", "true");
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <Title title="Welcome to OpenCut alpha! 🎉" />
              <Description description="You're among the first to try OpenCut - the fully open source CapCut alternative." />
            </div>
            <NextButton onClick={handleNext}>Next</NextButton>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <Title title="⚠️ This is a super early alpha!" />
              <Description description="OpenCut started just one month ago. There's still a ton of things to do to make this editor amazing." />
              <Description description="If you're curious, check out our roadmap [here](https://opencut.app/roadmap)" />
            </div>
            <NextButton onClick={handleNext}>Next</NextButton>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <Title title="🦋 Have fun testing!" />
              <Description description="Join our [Discord](https://discord.gg/zmR9N35cjK), chat with cool people and share feedback to help make OpenCut the best editor ever." />
            </div>
            <NextButton onClick={handleClose}>Finish</NextButton>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] !outline-none">
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}

function Title({ title }: { title: string }) {
  return <h2 className="text-lg md:text-xl font-bold">{title}</h2>;
}

function Subtitle({ subtitle }: { subtitle: string }) {
  return <h3 className="text-lg font-medium">{subtitle}</h3>;
}

function Description({ description }: { description: string }) {
  return (
    <div className="text-muted-foreground">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-0">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-foreground/80 underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {description}
      </ReactMarkdown>
    </div>
  );
}

function NextButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} variant="default" className="w-full">
      {children}
      <ArrowRightIcon className="w-4 h-4" />
    </Button>
  );
}
