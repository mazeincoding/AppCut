"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { MagicCard } from "../magicui/magic-card";

import Image from "next/image";
import { Handlebars } from "./handlebars";

interface HeroProps {
  signupCount: number;
}

// Create a hook to detect Electron after hydration
function useIsElectron() {
  const [isElectron, setIsElectron] = useState(false);
  
  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && window.electronAPI !== undefined);
  }, []);
  
  return isElectron;
}

export function Hero({ signupCount }: HeroProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isElectron = useIsElectron();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Skip API call in Electron builds
    if (isElectron) {
      toast({
        title: "Not available in desktop version",
        description: "Waitlist signup is only available in the web version.",
        variant: "default",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = (await response.json()) as { error: string };

      if (response.ok) {
        toast({
          title: "Welcome to the waitlist! 🎉",
          description: "You'll be notified when we launch.",
        });
        setEmail("");
      } else {
        toast({
          title: "Oops!",
          description:
            (data as { error: string }).error ||
            "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentJSX = (
    <>
      <div className="mb-8 flex justify-center">
        <a 
          href="https://vercel.com/home?utm_source=opencut" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-200 group shadow-lg"
        >
          <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
            Sponsored by
          </span>
          <div className="flex items-center gap-1.5">
            <div className="text-zinc-100 group-hover:text-white transition-colors">
              <svg className="w-4 h-4" width="20" height="18" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"></path>
              </svg>
            </div>
            <span className="text-xs font-medium text-zinc-100 group-hover:text-white transition-colors">
              Vercel
            </span>
          </div>
        </a>
      </div>
      <div className="inline-block font-bold tracking-tighter text-5xl md:text-[5rem]">
        <h1 className="text-[4rem] md:text-[7rem]">The Open Source</h1>
        <Handlebars>Video Editor</Handlebars>
      </div>

      <p className="mt-10 text-base sm:text-xl text-muted-foreground font-light tracking-wide max-w-xl mx-auto">
        A simple but powerful video editor that gets the job done. Works on
        any platform.
      </p>

      <div className="mt-8 flex gap-8 justify-center">
        <a href="/projects">
          <Button 
            variant="outline"
            className="h-24 px-20 text-base"
            style={{ 
              backgroundColor: 'white !important', 
              color: 'black !important', 
              borderColor: '#d1d5db !important',
              borderRadius: '12px !important'
            }}
          >
            Try early beta
            <ArrowRight className="ml-0.5 h-4 w-4" />
          </Button>
        </a>
      </div>

      {signupCount > 0 && (
        <div className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground justify-center">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>{signupCount.toLocaleString()} people already joined</span>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-[calc(100vh-4.5rem)] supports-[height:100dvh]:min-h-[calc(100dvh-4.5rem)] flex flex-col justify-between items-center text-center px-4">
      <Image
        className="absolute top-0 left-0 -z-50 size-full object-cover"
        src="./landing-page-bg.png"
        height={1903.5}
        width={1269}
        alt="landing-page.bg"
      />
      
      {isElectron ? (
        // Static version for Electron (no animations)
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center">
          {contentJSX}
        </div>
      ) : (
        // Animated version for browsers
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <div className="inline-block font-bold tracking-tighter text-5xl md:text-[5rem]">
              <h1 className="text-[4rem] md:text-[7rem]">The Open Source</h1>
              <Handlebars>Video Editor</Handlebars>
            </div>
          </motion.div>

          <motion.p
            className="mt-10 text-base sm:text-xl text-muted-foreground font-light tracking-wide max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            A simple but powerful video editor that gets the job done. Works on
            any platform.
          </motion.p>

          <motion.div
            className="mt-8 flex gap-8 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <a href="/projects">
              <Button 
                variant="outline"
                className="h-24 px-20 text-base"
                style={{ 
                  backgroundColor: 'white !important', 
                  color: 'black !important', 
                  borderColor: '#d1d5db !important',
                  borderRadius: '12px !important'
                }}
              >
                Try early beta
                <ArrowRight className="ml-0.5 h-4 w-4" />
              </Button>
            </a>
          </motion.div>

          {signupCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground justify-center"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>{signupCount.toLocaleString()} people already joined</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}