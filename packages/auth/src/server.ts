import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@opencut/db";
import { keys } from "./keys";

const { NEXT_PUBLIC_BETTER_AUTH_URL, BETTER_AUTH_SECRET } = keys()

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  secret: BETTER_AUTH_SECRET,
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  baseURL: NEXT_PUBLIC_BETTER_AUTH_URL,
  appName: "OpenCut",
  trustedOrigins: ["http://localhost:3000"],
});

export type Auth = typeof auth;
