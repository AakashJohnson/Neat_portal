// InstituteComponent shell: <app-navbar> <router-outlet> <app-footer>; the
// role check (role_id 5, else logout) is enforced by proxy.js.
import SiteChrome from '@/components/layout/SiteChrome';

export default function InstituteLayout({ children }) {
  return <SiteChrome>{children}</SiteChrome>;
}
