// CompanyComponent shell: <app-navbar> <router-outlet> <app-footer>; the
// role check (role_id 4, else logout) is enforced by proxy.js.
import SiteChrome from '@/components/layout/SiteChrome';

export default function CompanyLayout({ children }) {
  return <SiteChrome>{children}</SiteChrome>;
}
