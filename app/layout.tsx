import type { Metadata, Viewport } from 'next';
import { Amiri, Cairo, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#093c3a' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'نور الإسلام - المواقيت والقرآن والأذان',
  description:
    'تطبيق إسلامي شامل (PWA) لمواقيت الصلاة الدقيقة، الأذان التلقائي، منبه الأذكار بالصوت البشري، بوصلة القبلة الحقيقية، البث المباشر لإذاعة القرآن، والمصحف التفاعلي.',
  applicationName: 'نور الإسلام',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'نور الإسلام',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'نور الإسلام - المواقيت والقرآن والأذان',
    description:
      'تطبيق إسلامي شامل لمواقيت الصلاة الدقيقة، الأذان التلقائي لـ 11 مؤذناً، منبه الأذكار الصوتية، بوصلة القبلة الحقيقية، والبث المباشر.',
    type: 'website',
    locale: 'ar_EG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'نور الإسلام - المواقيت والقرآن والأذان',
    description:
      'تطبيق إسلامي شامل لمواقيت الصلاة الدقيقة، الأذان التلقائي، بوصلة القبلة الحقيقية، والمصحف التفاعلي.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`dark ${cairo.variable} ${amiri.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen overflow-x-hidden bg-slate-950 text-white antialiased selection:bg-amber-500/30 selection:text-amber-100">
        {children}
      </body>
    </html>
  );
}
