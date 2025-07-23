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

// ROOT CAUSE FIX: Complete removal of getStaticProps for Electron builds
// This prevents Next.js from generating any data URLs during static export