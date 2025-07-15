import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, useSession } = createAuthClient({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://opencut.app"
      : "http://localhost:3000",
});
