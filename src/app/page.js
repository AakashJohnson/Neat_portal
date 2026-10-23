// Route "" — LandingPageComponent (also the Angular "**" fallback, see not-found.js).
import SiteChrome from '@/components/layout/SiteChrome';
import Banner from '@/components/home/Banner';
import Highlights from '@/components/home/Highlights';
import BannerMessage from '@/components/home/BannerMessage';
import Announcement from '@/components/home/Announcement';

export default function LandingPage() {
  return (
    <SiteChrome>
      <Banner />
      <Highlights />
      <BannerMessage />
      <Announcement />
    </SiteChrome>
  );
}
