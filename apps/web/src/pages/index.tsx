import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { GetStaticProps } from 'next';

interface HomeProps {
  signupCount: number;
}

export default function Home({ signupCount }: HomeProps) {
  console.log('🏡 HomePage: Component rendered');
  
  return (
    <div>
      <Header />
      <Hero signupCount={signupCount} />
      <Footer />
    </div>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  console.log('🏡 HomePage: getStaticProps called');
  let signupCount = 0;
  
  // Skip waitlist count for Electron static export
  const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";
  
  if (!isElectron) {
    try {
      const { getWaitlistCount } = await import("@/lib/waitlist");
      signupCount = await getWaitlistCount();
    } catch (error) {
      console.warn("Failed to load waitlist count:", error);
    }
  }

  const result: any = {
    props: {
      signupCount,
    },
  };

  // Only use revalidate for non-Electron builds (static export doesn't support ISR)
  if (!isElectron) {
    result.revalidate = 60; // Revalidate every 60 seconds
  }

  return result;
};