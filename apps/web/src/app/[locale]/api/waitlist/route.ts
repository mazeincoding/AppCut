import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@opencut/db";
import { waitlist } from "@opencut/db/schema";
import { nanoid } from "nanoid";
import { waitlistRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
});

export async function POST(request: NextRequest) {
  // Rate limit check
  const identifier = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await waitlistRateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { email } = waitlistSchema.parse(body);

    // Check if email already exists
    const existingEmail = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Add to waitlist
    await db.insert(waitlist).values({
      id: nanoid(),
      email: email.toLowerCase(),
    });

    return NextResponse.json(
      { message: "Successfully joined waitlist!" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
