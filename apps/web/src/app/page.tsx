import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getWaitlistCount } from "@/lib/waitlist";

// Force dynamic rendering so waitlist count updates in real-time
export const dynamic = "force-dynamic";

export default async function Home() {
  const signupCount = await getWaitlistCount();

  return (
    <div>
      <Header />
      <Hero signupCount={signupCount} />
      <Footer />
    </div>
  );
}
