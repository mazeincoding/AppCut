"use client";

import { useRouter } from "next/navigation";
import { signIn, signUp } from "@opencut/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Zod schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface AuthFormProps {
  mode: "login" | "signup";
}

const authConfig = {
  login: {
    title: "Welcome back",
    description: "Sign in to your account to continue",
    buttonText: "Sign in",
    linkText: "Don't have an account?",
    linkHref: "/signup",
    linkLabel: "Sign up",
    successRedirect: "/editor",
  },
  signup: {
    title: "Create your account",
    description: "Get started with your free account today",
    buttonText: "Create account",
    linkText: "Already have an account?",
    linkHref: "/login",
    linkLabel: "Sign in",
    successRedirect: "/login",
  },
} as const;

interface AuthFormContentProps {
  error: string | null;
  setError: (error: string | null) => void;
  isGoogleLoading: boolean;
  config: typeof authConfig.login | typeof authConfig.signup;
  router: ReturnType<typeof useRouter>;
}

function LoginFormContent({
  error,
  setError,
  isGoogleLoading,
  config,
  router,
}: AuthFormContentProps) {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;
  const isAnyLoading = isSubmitting || isGoogleLoading;

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      const { error } = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setError(error.message || "An unexpected error occurred.");
        return;
      }

      router.push(config.successRedirect);
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="m@example.com"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isAnyLoading}
          className="w-full h-11"
          size="lg"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            config.buttonText
          )}
        </Button>
      </form>
    </Form>
  );
}

function SignupFormContent({
  error,
  setError,
  isGoogleLoading,
  config,
  router,
}: AuthFormContentProps) {
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", name: "" },
  });

  const { isSubmitting } = form.formState;
  const isAnyLoading = isSubmitting || isGoogleLoading;

  const onSubmit = async (data: SignupFormData) => {
    setError(null);

    try {
      const { error } = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (error) {
        setError(error.message || "An unexpected error occurred.");
        return;
      }

      router.push(config.successRedirect);
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="m@example.com"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Create a strong password"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isAnyLoading}
          className="w-full h-11"
          size="lg"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            config.buttonText
          )}
        </Button>
      </form>
    </Form>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const config = authConfig[mode];

  const handleGoogleAuth = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await signIn.social({
        provider: "google",
      });

      router.push(config.successRedirect);
    } catch (error) {
      setError(
        `Failed to ${mode === "login" ? "sign in" : "sign up"} with Google. Please try again.`
      );
      setIsGoogleLoading(false);
    }
  };

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
            {config.title}
          </CardTitle>
          <CardDescription className="text-base">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGoogleAuth}
              variant="outline"
              size="lg"
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}
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

            {mode === "login" ? (
              <LoginFormContent
                error={error}
                setError={setError}
                isGoogleLoading={isGoogleLoading}
                config={config}
                router={router}
              />
            ) : (
              <SignupFormContent
                error={error}
                setError={setError}
                isGoogleLoading={isGoogleLoading}
                config={config}
                router={router}
              />
            )}
          </div>

          <div className="mt-6 text-center text-sm">
            {config.linkText}{" "}
            <Link
              href={config.linkHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {config.linkLabel}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
