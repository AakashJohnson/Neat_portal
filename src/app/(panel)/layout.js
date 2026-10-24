// Root layout of the admin panel (port of the Laravel web/Blade panel,
// resources/views/layouts/{app,auth}.blade.php). Separate from the site's root
// layout so the panel gets only its own stylesheets (public/panel/assets),
// not the Angular site's cascade.
import { SessionProvider } from '@/components/providers/SessionProvider';

export const metadata = {
  title: 'Neat',
  icons: {
    icon: [
      { url: '/panel/assets/img/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/panel/assets/img/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/panel/assets/img/icons/apple-touch-icon-144x144.png', sizes: '144x144' },
      { url: '/panel/assets/img/icons/apple-touch-icon-152x152.png', sizes: '152x152' },
    ],
  },
  other: { 'application-name': 'Neat', 'msapplication-TileColor': '#FFFFFF', 'msapplication-TileImage': '/panel/assets/img/icons/mstile-144x144.png' },
};

export const viewport = { width: 'device-width', initialScale: 1, shrinkToFit: 'no' };

export default function PanelRootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
