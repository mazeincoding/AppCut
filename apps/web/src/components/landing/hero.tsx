"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import Image from "next/image";
import { Handlebars } from "./handlebars";
import { ChevronUp } from "lucide-react";

export function Hero() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email required", {
        description: "Please enter your email address.",
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
        toast.success("Welcome to the waitlist! 🎉", {
          description: "You'll be notified when we launch.",
        });
        setEmail("");
      } else {
        toast.error("Oops!", {
          description:
            (data as { error: string }).error ||
            "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      toast.error("Network error", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] supports-[height:100dvh]:min-h-[calc(100dvh-4.5rem)] flex flex-col justify-between items-center text-center px-4">
      <Image
        className="absolute top-0 left-0 -z-50 size-full object-cover"
        src="/landing-page-bg.png"
        height={1903.5}
        width={1269}
        alt="landing-page.bg"
      />
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
          className="inline-block font-bold tracking-tighter text-4xl md:text-[4rem]"
        >
          <h1>The Open Source</h1>
          <Handlebars>Video Editor</Handlebars>
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
          className="mt-12 flex gap-8 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <form
            onSubmit={handleSubmit}
            className="flex gap-3 w-full max-w-lg flex-col sm:flex-row"
          >
            <div className="relative w-full">
              <Input
                type="email"
                placeholder="Enter your email"
                className="h-11 text-base flex-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="px-6 h-11 text-base !bg-foreground"
              disabled={isSubmitting}
            >
              <span className="relative z-10">
                {isSubmitting ? "Joining..." : "Join waitlist"}
              </span>
              <ArrowRight className="relative z-10 ml-0.5 h-4 w-4 inline-block" />
            </Button>
          </form>
        </motion.div>
      </motion.div>
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 bg-foreground text-background p-3 rounded-full shadow-lg hover:bg-foreground/80 transition-colors duration-200"
          aria-label="Back to top"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
