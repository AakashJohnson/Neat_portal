// Port of components/pages/student-learners-gallery/student-learners-gallery.component.{html,ts}
import DownloadGallery from '@/components/gallery/DownloadGallery';
import imageNames from '../../../../public/assets/img/student-learners-download/ImageName.json';

export default function Page() {
  return <DownloadGallery scope="student-learners-gallery" title="Student Learners Gallery" imageNames={imageNames} />;
}
