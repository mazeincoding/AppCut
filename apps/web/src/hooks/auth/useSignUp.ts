import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@opencut/auth/client";

// Helper to map raw error messages to user-friendly messages
function getFriendlySignUpError(message?: string): string {
    if (!message) return "An unexpected error occurred. Please try again.";
    const msg = message.toLowerCase();
    if (msg.includes("email already registered") || msg.includes("email already exists") || msg.includes("user already exists")) {
        return "An account with this email already exists.";
    }
    if (msg.includes("invalid email")) {
        return "Please enter a valid email address.";
    }
    if (msg.includes("weak password") || msg.includes("password too short") || msg.includes("password must be")) {
        return "Password is too weak. Please use a stronger password.";
    }
    if (msg.includes("too many requests") || msg.includes("rate limit")) {
        return "Too many signup attempts. Please wait and try again later.";
    }
    if (msg.includes("network error") || msg.includes("failed to fetch")) {
        return "Network error. Please check your connection and try again.";
    }
    return message;
}

export function useSignUp() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleSignUp = useCallback(async () => {
        setError(null);
        setIsEmailLoading(true);

        const { error } = await signUp.email({
            name,
            email,
            password,
        });

        if (error) {
            setError(getFriendlySignUpError(error.message));
            setIsEmailLoading(false);
            return;
        }

        router.push("/login");
    }, [name, email, password, router]);

    const handleGoogleSignUp = useCallback(async () => {
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
    }, [router]);

    const isAnyLoading = isEmailLoading || isGoogleLoading;

    return {
        name,
        setName,
        email,
        setEmail,
        password,
        setPassword,
        error,
        isEmailLoading,
        isGoogleLoading,
        isAnyLoading,
        handleSignUp,
        handleGoogleSignUp,
    };
}