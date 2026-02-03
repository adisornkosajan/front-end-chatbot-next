import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'th'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale ?? 'en';

  return {
    messages: (await import(`./locales/${resolvedLocale}.json`)).default,
    locale: resolvedLocale,
  };
});
