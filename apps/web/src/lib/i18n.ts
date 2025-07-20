import NextI18Next from 'next-i18next';
import path from 'path';

const NextI18NextInstance = new NextI18Next({
  defaultLanguage: 'en',
  otherLanguages: ['id'],
  localePath: path.resolve('./public/locales'),
});

export default NextI18NextInstance;
export const { appWithTranslation, useTranslation } = NextI18NextInstance;
