import Script from 'next/script';
import Providers from '@/components/providers/Providers';

export const metadata = {
  title: 'NEAT',
  description: 'National Educational Alliance for Technology (NEAT) — AICTE, Ministry of Education, Government of India',
  icons: { icon: '/assets/theme/img/logo/neat-logo-top.png' },
};

export const viewport = { width: 'device-width', initialScale: 1 };

// Port of src/index.html: fonts, Google Analytics (UA-162699883-1) and the
// Twitter widgets script used by the announcement/contact/team pages.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {
                                                                                    }
        <base href="/" />
        {/* Same font URLs as src/index.html (root layout, so every page gets them). */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
        {                                                                                                                 }
        {                                                                                                                                 }
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/theme/portal.css" />
        {                                                                                                 }
        {                                                                                            }
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/theme/material.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/theme/components.css" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Script src="https://www.googletagmanager.com/gtag/js?id=UA-162699883-1" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'UA-162699883-1');`}
        </Script>
        <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
