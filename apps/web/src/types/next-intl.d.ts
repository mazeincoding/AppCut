import { routing } from '@/i18n/routing';

// 为 next-intl 声明模块类型
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
  }
}
