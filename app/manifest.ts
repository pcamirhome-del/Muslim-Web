import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'نور الإسلام - المواقيت والأذان والقرآن',
    short_name: 'نور الإسلام',
    description:
      'تطبيق إسلامي شامل لمواقيت الصلاة الدقيقة، الأذان التلقائي، الأذكار الصوتية، بوصلة القبلة، البث المباشر للقرآن، والمصحف التفاعلي.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#020617',
    theme_color: '#093c3a',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'مواقيت الصلاة والودجت',
        short_name: 'المواقيت',
        url: '/?tab=home',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'إذاعة القرآن المباشرة',
        short_name: 'البث المباشر',
        url: '/?tab=radio',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'بوصلة القبلة',
        short_name: 'القبلة',
        url: '/?tab=qibla',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'المصحف الشريف',
        short_name: 'القرآن',
        url: '/?tab=quran',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
