import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import GreenThemeWrapper from "@/components/GreenThemeWrapper";
import { Providers } from "@/providers/Providers";
import { getDictionary, hasLocale, Locale } from "@/utils/dictionaries";
import { notFound } from "next/navigation";
import { LanguageProvider } from "@/providers/LanguageProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trackerthon: Finance",
  description: "Financial tracking and sync for your startup",
};

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'pt' },
    { locale: 'de' },
    { locale: 'fr' },
    { locale: 'ja' },
  ];
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({
  children,
  params,
}: Readonly<LayoutProps>) {
  const { locale } = await params;

  if (!hasLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <html
      lang={locale}
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <Providers>
          <LanguageProvider locale={locale as Locale} dictionary={dictionary}>
            <GreenThemeWrapper>
              {children}
            </GreenThemeWrapper>
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}


