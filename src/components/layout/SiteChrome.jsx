// Pages that embedded <app-navbar> … <app-footer> in Angular.
import Navbar from './Navbar';
import Footer from './Footer';
import ScrollUp from './ScrollUp';

export default function SiteChrome({ children, footer = true }) {
  return (
    <>
      <Navbar />
      {children}
      {footer && <Footer />}
      <ScrollUp />
    </>
  );
}
