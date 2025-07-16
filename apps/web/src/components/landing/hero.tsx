"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SponsorButton } from "../ui/sponsor-button";
import { VercelIcon } from "../icons";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import Image from "next/image";
import { Handlebars } from "./handlebars";

export function Hero() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/waitlist/token", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.token) {
          setCsrfToken(data.token);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch CSRF token:", err);
        if (isMounted) {
          toast.error("Security initialization failed", {
            description: "Please refresh the page to continue.",
          });
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email required", {
        description: "Please enter your email address.",
      });
      return;
    }

    if (!csrfToken) {
      toast.error("Security error", {
        description: "Please refresh the page and try again.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = (await response.json()) as { error: string };

      if (response.ok) {
        toast.success("Welcome to the waitlist! 🎉", {
          description: "You'll be notified when we launch.",
        });
        setEmail("");

        fetch("/api/waitlist/token", { credentials: "include" })
          .then((res) => res.json())
          .then((data) => {
            if (data.token) setCsrfToken(data.token);
          })
          .catch((err) => {
            console.error("Failed to refresh CSRF token:", err);
          });
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
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mb-8 flex justify-center"
        >
          <SponsorButton 
            href="https://vercel.com/?utm_source=opencut"
            logo={VercelIcon}
            companyName="Vercel"
          />
        </motion.div>
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
                disabled={isSubmitting || !csrfToken}
                required
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="px-6 h-11 text-base !bg-foreground"
              disabled={isSubmitting || !csrfToken}
            >
              <span className="relative z-10">
                {isSubmitting ? "Joining..." : "Join waitlist"}
              </span>
              <ArrowRight className="relative z-10 ml-0.5 h-4 w-4 inline-block" />
            </Button>
          </form>
        </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground justify-center"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>50k+ people already joined</span>
          </motion.div>
      </motion.div>
    </div>
  );
}
