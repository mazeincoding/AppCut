"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getStars } from "@/lib/fetchGhStars";

interface HeroProps {
  signupCount: number;
}

export function Hero({ signupCount }: HeroProps) {
  const [star, setStar] = useState<string>();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const data = await getStars();
        setStar(data);
      } catch (err) {
        console.error("Failed to fetch GitHub stars", err);
      }
    };

    fetchStars();
  }, []);

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

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Welcome to the waitlist! 🎉",
          description: "You'll be notified when we launch.",
        });
        setEmail("");
      } else {
        toast({
          title: "Oops!",
          description: data.error || "Something went wrong. Please try again.",
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

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="max-w-3xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="inline-block"
        >
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter">
            The open source
          </h1>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter mt-2">
            video editor
          </h1>
        </motion.div>

        <motion.p
          className="mt-10 text-lg sm:text-xl text-muted-foreground font-light tracking-wide max-w-xl mx-auto"
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
          <form onSubmit={handleSubmit} className="flex gap-3 w-full max-w-lg">
            <Input
              type="email"
              placeholder="Enter your email"
              className="h-11 text-base flex-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <Button
              type="submit"
              size="lg"
              className="px-6 h-11 text-base"
              disabled={isSubmitting}
            >
              <span className="relative z-10">
                {isSubmitting ? "Joining..." : "Join waitlist"}
              </span>
              <ArrowRight className="relative z-10 ml-0.5 h-4 w-4 inline-block" />
            </Button>
          </form>
        </motion.div>

        {signupCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-6 inline-flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-full text-sm text-muted-foreground"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>{signupCount.toLocaleString()} people already joined</span>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className="absolute bottom-12 left-0 right-0 text-center text-sm text-muted-foreground/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        Currently in beta • Open source on{" "}
        <Link
          href="https://github.com/OpenCut-app/OpenCut"
          className="text-foreground underline"
        >
          GitHub {star}+
        </Link>
      </motion.div>
    </div>
  );
}
