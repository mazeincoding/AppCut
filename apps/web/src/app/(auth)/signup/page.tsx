"use client";

import { useRouter } from "next/navigation";
import { signUp, signIn } from "@opencut/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import { GoogleIcon } from "@/components/icons";

function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignUp = async () => {
    setError(null);
    setIsEmailLoading(true);

    const { error } = await signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      setError(error.message || "An unexpected error occurred.");
      setIsEmailLoading(false);
      return;
    }

    router.push("/login");
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await signIn.social({
        provider: "google",
      });

      router.push("/editor");
    } catch (error) {
      setError("Failed to sign up with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const isAnyLoading = isEmailLoading || isGoogleLoading;

  return (
    <div className="flex flex-col space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleGoogleSignUp}
        variant="outline"
        size="lg"
        disabled={isAnyLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}{" "}
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isAnyLoading}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isAnyLoading}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isAnyLoading}
            className="h-11"
          />
        </div>
        <Button
          onClick={handleSignUp}
          disabled={isAnyLoading || !name || !email || !password}
          className="w-full h-11"
          size="lg"
        >
          {isEmailLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            "Create account"
          )}
        </Button>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen items-center justify-center relative">
      <Button
        variant="text"
        onClick={() => router.back()}
        className="absolute top-6 left-6"
      >
        <ArrowLeft className="h-5 w-5" /> Back
      </Button>

      <Card className="w-[400px] shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-semibold">
            Create your account
          </CardTitle>
          <CardDescription className="text-base">
            Get started with your free account today
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Suspense
            fallback={
              <div className="text-center">
                <Loader2 className="animate-spin" />
              </div>
            }
          >
            <SignUpForm />
          </Suspense>
          <div className="mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
