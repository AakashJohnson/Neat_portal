// Port of components/pages/woman-empowerment-downloads/woman-empowerment-downloads.component.{html,ts}
import DownloadGallery from '@/components/gallery/DownloadGallery';
import imageNames from '../../../../public/assets/img/woman-empowerment-download/ImageName.json';

export default function Page() {
  return <DownloadGallery scope="woman-empowerment-downloads" title="Woman Empowerment Gallery" imageNames={imageNames} />;
}
