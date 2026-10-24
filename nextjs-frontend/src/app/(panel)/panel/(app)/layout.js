// layouts/app.blade.php: vendor.css + app.css, navbar + sidebar around the page.
import PanelShell from '@/components/panel/PanelShell';

export default function PanelAppLayout({ children }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" media="all" type="text/css" href="/panel/assets/css/vendor.css" precedence="panel" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" media="all" type="text/css" href="/panel/assets/css/app.css" precedence="panel" />
      {/* SweetAlert's injected styles (delete confirmations). */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/panel/assets/css/sweetalert.css" precedence="panel" />
      {/* announcements plugin (app:styles hook) */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" media="all" type="text/css" href="/panel/vendor/plugins/announcements/css/announcements.css" precedence="panel" />
      <PanelShell>{children}</PanelShell>
    </>
  );
}
