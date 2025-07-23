import { db, sql } from "@/lib/workspace-packages/db";
import { waitlist } from "@/lib/workspace-packages/db/schema";

export async function getWaitlistCount() {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitlist);
    return result[0]?.count || 0;
  } catch (error) {
    console.error("Failed to fetch waitlist count:", error);
    return 0;
  }
}
