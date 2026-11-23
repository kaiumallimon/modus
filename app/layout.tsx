import type { Metadata } from 'next';
import { Inter, DM_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/providers/auth-provider';
import { Toaster } from '@/components/base/toast/toast';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Modus — Business Management System',
  description: 'Self-hosted modular enterprise platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background-full text-text-primary antialiased font-sans">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
