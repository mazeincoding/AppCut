import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getWaitlistCount } from "@/lib/waitlist";
import { setRequestLocale, getTranslations } from 'next-intl/server';

// Force dynamic rendering so waitlist count updates in real-time
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "en" | "zh" | "ja" | "ko", namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  
  // 启用静态渲染
  setRequestLocale(locale as "en" | "zh" | "ja" | "ko");
  
  const signupCount = await getWaitlistCount();

  return (
    <div>
      <Header />
      <Hero signupCount={signupCount} />
      <Footer />
    </div>
  );
}
