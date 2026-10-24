// LearnerComponent shell: <app-navbar> <router-outlet> <app-footer> (no role check).
import SiteChrome from '@/components/layout/SiteChrome';

export default function LearnerLayout({ children }) {
  return <SiteChrome>{children}</SiteChrome>;
}
