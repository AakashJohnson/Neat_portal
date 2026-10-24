// Route "announcement" — AnnouncementComponent on its own (its template has no
// <app-navbar>/<app-footer>, so neither does this page).
import Announcement from '@/components/home/Announcement';

export default function AnnouncementPage() {
  return <Announcement />;
}
