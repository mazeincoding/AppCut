import { NextRequest, NextResponse } from "next/server";
import { db, eq, waitlist } from "@opencut/db";
import { checkBotId } from "botid/server";
import { nanoid } from "nanoid";
import { waitlistRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { env } from "@/env";
import { cookies } from "next/headers";
import crypto from "crypto";

const waitlistSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
});

const CSRF_TOKEN_NAME = "waitlist-csrf";
const TOKEN_EXPIRY = 60 * 60 * 1000;

async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  const clientToken = request.headers.get("x-csrf-token");
  if (!clientToken) return false;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CSRF_TOKEN_NAME)?.value;
  if (!cookieValue) return false;

  const [token, timestamp, signature] = cookieValue.split(":");
  if (!token || !timestamp || !signature) return false;

  if (clientToken !== token) return false;

  const now = Date.now();
  const tokenTime = parseInt(timestamp);
  if (now - tokenTime > TOKEN_EXPIRY) return false;

  const expectedSignature = crypto.createHmac("sha256", env.BETTER_AUTH_SECRET).update(`${token}:${timestamp}`).digest("hex");

  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  const verification = await checkBotId();

  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const identifier = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await waitlistRateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }
  const isValidToken = await validateCSRFToken(request);
  if (!isValidToken) {
    return NextResponse.json({ error: "Invalid security token" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email } = waitlistSchema.parse(body);

    const existingEmail = await db.select().from(waitlist).where(eq(waitlist.email, email.toLowerCase())).limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    await db.insert(waitlist).values({
      id: nanoid(),
      email: email.toLowerCase(),
    });

    return NextResponse.json({ message: "Successfully joined waitlist!" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    console.error("Waitlist signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
