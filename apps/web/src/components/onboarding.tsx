"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Onboarding({ isOpen, onClose }: OnboardingProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to Clipture</DialogTitle>
          <DialogDescription>
            Let's get you started with the basics.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
