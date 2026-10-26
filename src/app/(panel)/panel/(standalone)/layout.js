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
