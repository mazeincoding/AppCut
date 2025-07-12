'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const localeNames = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어'
} as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "en" | "zh" | "ja" | "ko" });
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {localeNames[lang as keyof typeof localeNames]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
