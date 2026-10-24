// Left column of the login/register pages: Bootstrap carousel with two slides
// and the same caption (identical markup in both templates).
import Carousel from '@/components/common/Carousel';

const slide = (img) => (
  <>
    <img className="d-block img-fluid" src={`/assets/img/${img}`} alt="AICTE" />
    <div className="carousel-caption d-none d-md-block">
      <div className="banner-text">
        {' '}NEAT (National Education Alliance for Technology) is a Govt. of India initiative for skilling of learners in latest technologies through a PPP (Public Private Partnership) model.{' '}
      </div>
    </div>
  </>
);

export default function AuthBanner() {
  return (
    <div className="col-md-6 banner-sec">
      <Carousel id="carouselExampleIndicators" indicators={2} slides={[slide('login01.jpg'), slide('login02.jpg')]} innerProps={{ role: 'listbox' }} />
    </div>
  );
}
