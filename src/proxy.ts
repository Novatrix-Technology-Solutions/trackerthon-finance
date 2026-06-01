import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './utils/dictionaries';

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return defaultLocale;

  // Split languages and match against supported locales
  const preferredLocales = acceptLanguage
    .split(',')
    .map((lang) => lang.split(';')[0].trim().toLowerCase().split('-')[0]);

  for (const lang of preferredLocales) {
    if (locales.includes(lang as any)) {
      return lang;
    }
  }

  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if pathname already starts with a supported locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  // Redirect to localized URL
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next) and static assets/APIs
    '/((?!api|_next/static|_next/image|favicon.ico|netlify.toml|eslint.config.mjs|.*\\.png$).*)',
  ],
};
