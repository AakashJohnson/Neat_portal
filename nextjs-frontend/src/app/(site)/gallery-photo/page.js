// Port of components/pages/gallery-photo/gallery-photo.component.{html,ts}
// (the ImageName.json-driven grid is commented out in the original template;
// the nine fixed images below are what it renders).
import SiteChrome from '@/components/layout/SiteChrome';
import Scope from '@/components/common/Scope';
import LightboxGallery from '@/components/common/LightboxGallery';

const IMAGES = ['g01', 'g09', 'g02', 'g10', 'g03', 'g11', 'g04', 'g12', 'g05'].map((n) => `/assets/img/${n}.jpg`);

// R-31 (original defect, reproduced): the template calls onClick(1) on the
// first image and onClick(2) on all others; onClick(n) opens slide n + 1.
const THUMB_SLIDES = [2, 3, 3, 3, 3, 3, 3, 3, 3];

export default function GalleryPhotoPage() {
  return (
    <SiteChrome>
      <Scope name="gallery-photo">
        <div>
          <div className="container">
            <div className="row">
              <div className="col-md-12">
                <div className="section-title-wrapper">
                  <div className="section-title mt-4" style={{ marginTop: '40px' }}>
                    <div>
                      <h3>Image Gallery</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Images */}
        <LightboxGallery
          thumbs={IMAGES.map((src, i) => ({ src, slide: THUMB_SLIDES[i] }))}
          slides={IMAGES.map((src, i) => ({ src, label: i + 1 }))}
        />
      </Scope>
    </SiteChrome>
  );
}
