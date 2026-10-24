// layouts/auth.blade.php: app.css + fontawesome, <body class="auth">, .container.
import BodyClass from '@/components/panel/BodyClass';

export default function PanelAuthLayout({ children }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/panel/assets/css/app.css" precedence="panel" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/panel/assets/css/fontawesome-all.min.css" precedence="panel" />
      <BodyClass name="auth" />
      <div className="container">{children}</div>
    </>
  );
}
