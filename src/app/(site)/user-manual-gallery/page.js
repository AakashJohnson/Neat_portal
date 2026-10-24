// Port of components/pages/user-manual-gallery/user-manual-gallery.component.{html,ts}
import DownloadGallery from '@/components/gallery/DownloadGallery';
import imageNames from '../../../../public/assets/img/user-manual-download/ImageName.json';

export default function Page() {
  return <DownloadGallery scope="user-manual-gallery" title="User Manual Gallery" imageNames={imageNames} />;
}
