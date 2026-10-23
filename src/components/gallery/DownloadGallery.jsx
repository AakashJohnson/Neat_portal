// Shared port of the four "download" galleries (woman-empowerment-downloads,
// student-learners-gallery, institution-gallery, user-manual-gallery): same
// template, only the breadcrumb title and the ImageName.json list differ.
// All four render files from assets/img/downloads/ (as in the originals).
import Link from 'next/link';
import SiteChrome from '@/components/layout/SiteChrome';
import Scope from '@/components/common/Scope';
import LightboxGallery from '@/components/common/LightboxGallery';

export default function DownloadGallery({ scope, title, imageNames }) {
  // `for (var img in ImageName.Images)` → the JSON keys, in order.
  const images = Object.keys(imageNames.Images ?? {});
  const src = (image) => `/assets/img/downloads/${image}`;
  return (
    <SiteChrome>
      <Scope name={scope}>
        <div className="breadcrumb-banner-area">
          <div className="container">
            <div className="row">
              <div className="col-md-12">
                <div className="breadcrumb-text">
                  <div className="breadcrumb-bar">
                    <ul className="breadcrumb text-center">
                      <li>
                        <Link href="/">Home</Link>
                      </li>
                      <li>{title}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Images */}
        <LightboxGallery
          thumbs={images.map((image, i) => ({ src: src(image), slide: i + 1, alt: 'hhhhhh' }))}
          slides={images.map((image, i) => ({ src: src(image), label: i }))}
        />
      </Scope>
    </SiteChrome>
  );
}
