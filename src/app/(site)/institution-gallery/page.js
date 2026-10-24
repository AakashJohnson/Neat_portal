// Port of components/pages/institution-gallery/institution-gallery.component.{html,ts}
import DownloadGallery from '@/components/gallery/DownloadGallery';
import imageNames from '../../../../public/assets/img/institution-download/ImageName.json';

export default function Page() {
  return <DownloadGallery scope="institution-gallery" title="Institution Gallery" imageNames={imageNames} />;
}
