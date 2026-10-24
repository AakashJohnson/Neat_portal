// Port of app/components/pages/gallery-video/gallery-video.component.{html,ts}
import SiteChrome from '@/components/layout/SiteChrome';

export default function GalleryVideoPage() {
  return (
    <SiteChrome>
      <div>
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title mt-4" style={{ marginTop: "40px" }}>
                  <div>
                    <h3>
                      Video Gallery
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="contact-form-area section-padding">
        <div className="container">
          <div className="row">
            <div className="col-lg-12 col-md-12">
              <div className="gallery-area">
                <div className="container">
                  <div className="row">
                    <div className="col-lg-4 col-md-6 mb-30">
                      <div className="fix video-gallery">
                        <iframe width="100%" height="200" src="https://www.youtube.com/embed/8q2viqtYgP8" frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                      </div>
                    </div>
                    <div className="col-lg-4 col-md-6 mb-30">
                      <div className="fix video-gallery">
                        <iframe width="100%" height="200" src="https://www.youtube.com/embed/8q2viqtYgP8" frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                      </div>
                    </div>
                    <div className="col-lg-4 col-md-6 mb-30">
                      <div className="fix video-gallery">
                        <iframe width="100%" height="200" src="https://www.youtube.com/embed/8q2viqtYgP8" frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                      </div>
                    </div>
                    <div className="col-lg-4 col-md-6 mb-30">
                      <div className="fix video-gallery">
                        <iframe width="100%" height="200" src="https://www.youtube.com/embed/8q2viqtYgP8" frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                      </div>
                    </div>
                    <div className="col-lg-4 col-md-6 mb-30">
                      <div className="fix video-gallery">
                        <iframe width="100%" height="200" src="https://www.youtube.com/embed/8q2viqtYgP8" frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                      </div>
                    </div>
                    <div className="col-lg-4 col-md-6 mb-30">
                      <div className="fix video-gallery">
                        <iframe width="100%" height="200" src="https://www.youtube.com/embed/8q2viqtYgP8" frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}

