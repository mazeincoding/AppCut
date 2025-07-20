import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@opencut/auth/client";

// Helper to map raw error messages to user-friendly messages
function getFriendlyLoginError(message?: string): string {
    if (!message) return "An unexpected error occurred. Please try again.";
    const msg = message.toLowerCase();
    if (msg.includes("invalid credentials") || msg.includes("invalid email or password") || msg.includes("incorrect password")) {
        return "Invalid email or password. Please try again.";
    }
    if (msg.includes("user not found") || msg.includes("no account") || msg.includes("not registered")) {
        return "No account found with this email.";
    }
    if (msg.includes("verify your email") || msg.includes("email not verified")) {
        return "Please verify your email address before logging in.";
    }
    if (msg.includes("too many requests") || msg.includes("rate limit")) {
        return "Too many login attempts. Please wait and try again later.";
    }
    if (msg.includes("network error") || msg.includes("failed to fetch")) {
        return "Network error. Please check your connection and try again.";
    }
    return message;
}

export function useLogin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleLogin = useCallback(async () => {
        setError(null);
        setIsEmailLoading(true);

        const { error } = await signIn.email({
            email,
            password,
        });

        if (error) {
            setError(getFriendlyLoginError(error.message));
            setError(getFriendlyError(error));
            setIsEmailLoading(false);
            return;
        }

        router.push("/projects");
    }, [router, email, password]);

    const handleGoogleLogin = async () => {
        setError(null);
        setIsGoogleLoading(true);

        try {
            await signIn.social({
                provider: "google",
                callbackURL: "/projects",
            });
        } catch (error) {
            setError("Failed to sign in with Google. Please try again.");
            setIsGoogleLoading(false);
        }
    };

    const isAnyLoading = isEmailLoading || isGoogleLoading;

    return {
        email,
        setEmail,
        password,
        setPassword,
        error,
        isEmailLoading,
        isGoogleLoading,
        isAnyLoading,
        handleLogin,
        handleGoogleLogin,
    };
}

function getFriendlyError(error: any) {
    if (!error) return "An unexpected error occurred. Please try again.";
    const msg = error.message?.toLowerCase() || "";
    if (msg.includes("invalid") || msg.includes("credentials")) {
        return "Invalid email or password. Please try again.";
    }
    if (msg.includes("not found")) {
        return "No account found with this email.";
    }
    // Add more mappings as needed
    return "An unexpected error occurred. Please try again.";
}
