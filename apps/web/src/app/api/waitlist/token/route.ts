import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { env } from "@/env";

const CSRF_TOKEN_NAME = "waitlist-csrf";
const TOKEN_EXPIRY = 60 * 60 * 1000;
const allowedHosts = env.NODE_ENV === "development" ? ["localhost:3000", "127.0.0.1:3000"] : ["opencut.app", "www.opencut.app"];

export async function GET(request: NextRequest) {
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (referer) {
    const refererUrl = new URL(referer);

    if (!allowedHosts.some((allowed) => refererUrl.host === allowed || refererUrl.host.endsWith(allowed))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (host) {
    if (!allowedHosts.some((allowed) => host === allowed || host.endsWith(allowed))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET must be configured");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const timestamp = Date.now();
  const signature = crypto.createHmac("sha256", env.BETTER_AUTH_SECRET).update(`${token}:${timestamp}`).digest("hex");

  const cookieStore = await cookies();
  cookieStore.set(CSRF_TOKEN_NAME, `${token}:${timestamp}:${signature}`, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TOKEN_EXPIRY / 1000,
    path: "/",
  });

  return NextResponse.json({ token });
}
