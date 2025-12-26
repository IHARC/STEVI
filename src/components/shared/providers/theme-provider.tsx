'use client';

import * as React from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

type ThemeProviderProps = {
  children: React.ReactNode;
  nonce?: string | null;
};

export function ThemeProvider({ children, nonce }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce ?? undefined}
    >
      {children}
    </NextThemeProvider>
  );
}
