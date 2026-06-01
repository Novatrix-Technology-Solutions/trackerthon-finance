"use client";

import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/queryClient";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { Toaster } from "react-hot-toast";

// Suppress the React 19 warning for the next-themes script tag in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" value={{ light: 'emerald', dark: 'dark', system: 'emerald' }} defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          {children}
          <Toaster position="bottom-right" />
        </CurrencyProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}

