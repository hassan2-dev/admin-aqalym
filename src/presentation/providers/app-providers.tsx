'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/presentation/providers/auth-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1, gcTime: 5 * 60_000 },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={client}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-center" dir="rtl" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
