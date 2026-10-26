import SiteChrome from '@/components/layout/SiteChrome';
import Scope from '@/components/common/Scope';
import LightboxGallery from '@/components/common/LightboxGallery';

const IMAGES = ['g01', 'g09', 'g02', 'g10', 'g03', 'g11', 'g04', 'g12', 'g05'].map((n) => `/assets/img/${n}.jpg`);


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
