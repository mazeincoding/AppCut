import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

// Static export compatibility - skip dynamic features for Electron
const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";

// Force dynamic rendering so waitlist count updates in real-time (commented out for Electron compatibility)
// export const dynamic = "force-dynamic";

export default async function Home() {
  let signupCount = 0;
  
  // Skip waitlist count for Electron static export
  if (!isElectron) {
    try {
      const { getWaitlistCount } = await import("@/lib/waitlist");
      signupCount = await getWaitlistCount();
    } catch (error) {
      console.warn("Failed to load waitlist count:", error);
    }
  }

  return (
    <div>
      <Header />
      <Hero signupCount={signupCount} />
      <Footer />
    </div>
  );
}
