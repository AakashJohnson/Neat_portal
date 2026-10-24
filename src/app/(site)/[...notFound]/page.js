// Angular route "**" → LandingPageComponent: any unknown URL shows the home
// page (the Angular app answered every path with index.html, HTTP 200).
import LandingPage from '../page';

export default function CatchAll() {
  return <LandingPage />;
}
