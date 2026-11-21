import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'SLM After-Sales',
  description: 'Claims, dealers and reports for SLM Tyres after-sales',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#C00000', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
