// company-profile/{index,product}.blade.php: standalone pages (no layout)
// with vendor.css + app.css and a white body. The original routes were public;
// the endpoints now need users.manage (DEV-15/16), so a guest is sent to login.
import StandaloneGuard from '@/components/panel/StandaloneGuard';

export default function PanelStandaloneLayout({ children }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" media="all" type="text/css" href="/panel/assets/css/vendor.css" precedence="panel" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" media="all" type="text/css" href="/panel/assets/css/app.css" precedence="panel" />
      <style>{'body { background: #fff!important; }'}</style>
      <StandaloneGuard>{children}</StandaloneGuard>
    </>
  );
}
