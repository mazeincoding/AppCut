import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // 支持的语言列表
  locales: ['en', 'zh', 'ja', 'ko'],

  // 默认语言
  defaultLocale: 'en',

  // 语言前缀配置 - 使用 'as-needed' 让默认语言不显示前缀
  localePrefix: 'as-needed'
});
