import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
// CONDITIONAL IMPORT: Only import GetStaticProps for web builds
import type { GetStaticProps } from 'next';

interface HomeProps {
  signupCount?: number;
}

export default function Home({ signupCount = 0 }: HomeProps) {
  console.log('🏡 HomePage: Component rendered');
  
  return (
    <div>
      <Header />
      <Hero signupCount={signupCount} />
      <Footer />
    </div>
  );
}

// =================== ROOT CAUSE FIX: PREVENT DATA FETCHING IN ELECTRON ===================
// ULTRASYNC DEEPSYNC FACE-IT: Remove getStaticProps entirely for Electron builds
// This prevents Next.js from generating data URLs that cause fetch requests

// Only export getStaticProps for web builds - completely exclude for Electron
// NOTE: This is build-time elimination, not runtime conditional
const isElectronBuild = process.env.NEXT_PUBLIC_ELECTRON === "true";

// FACE-IT: Conditionally export getStaticProps to prevent data generation
if (!isElectronBuild) {
  // DEEPSYNC: Use eval to prevent webpack from analyzing the import during Electron builds
  const getStaticPropsFunc = async () => {
    console.log('🏡 HomePage: getStaticProps called (web build only)');
    let signupCount = 0;
    
    try {
      // ULTRASYNC: Dynamic import only executed at runtime, not build analysis time
      const waitlistModule = await eval('import("@/lib/waitlist")');
      signupCount = await waitlistModule.getWaitlistCount();
    } catch (error) {
      console.warn("Failed to load waitlist count:", error);
    }

    return {
      props: {
        signupCount,
      },
      revalidate: 60, // Revalidate every 60 seconds
    };
  };
  
  module.exports.getStaticProps = getStaticPropsFunc;
} else {
  console.log('🔧 [ROOT CAUSE FIX] Electron build detected - getStaticProps completely excluded');
}