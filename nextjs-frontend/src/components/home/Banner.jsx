// Port of components/pages/banner/banner.component.html
import { Fragment } from 'react';
import Link from 'next/link';
import Carousel from '@/components/common/Carousel';

// Keys: the array crosses the server→client component boundary.
const slides = [
  <Fragment key="1">
    <div className="col-lg-6 col-xl-6 float-right slideBnrImg">
      <div className="banner_text">
        <img src="/assets/img/banner_img.png" alt="" />
      </div>
    </div>
    <div className="col-lg-6 col-xl-6 float-left slideBnrTxt">
      <div className="banner_text">
        <div className="banner_text_iner">
          <h1>Personalized Learning</h1>
          <p>using the best education technology from industry</p>
          <Link href="/aboutNeat" className="btn_1">
            Explore More{' '}
          </Link>
        </div>
      </div>
    </div>
  </Fragment>,
  <div key="2" className="col-lg-12 col-xl-12 float-right slideBnrImg">
    <div className="banner_text">
      <img src="/assets/img/slide02.jpg" className="desktopEdTech" alt="" />
      <img src="/assets/img/mobile-ed-tech-banner.jpg" className="mEdTech" alt="" />
    </div>
  </div>,
  <div key="3" className="col-lg-12 col-xl-12 float-right slideBnrImg">
    <div className="banner_text">
      <img src="/assets/img/slide03.jpg" className="desktopEdTech" alt="" />
      <img src="/assets/img/mobile-student-banner.jpg" className="mEdTech" alt="" />
    </div>
  </div>,
];

export default function Banner() {
  return (
    <section className="banner_part">
      <div className="container">
        <div className="row align-items-center">
          {                                                                 }
          <Carousel id="main-carousel" slides={slides} indicators={2} controls />
        </div>
      </div>
    </section>
  );
}
