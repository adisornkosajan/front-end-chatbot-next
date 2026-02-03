import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always', // Always use /en or /th prefix
});

export const config = {
  // Match all pathnames except for API routes, static files, etc.
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
