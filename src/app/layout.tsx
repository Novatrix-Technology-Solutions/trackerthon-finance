import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GreenThemeWrapper from "@/components/GreenThemeWrapper";
import { CurrencyProvider } from "@/components/CurrencyProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trackerthon: Finance",
  description: "Financial tracking and sync for your startup",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CurrencyProvider>
          <GreenThemeWrapper>
            {children}
          </GreenThemeWrapper>
        </CurrencyProvider>
      </body>
    </html>
  );
}

