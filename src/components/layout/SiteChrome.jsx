// Pages that embedded <app-navbar> … <app-footer> in Angular.
import Navbar from './Navbar';
import Footer from './Footer';
import ScrollUp from './ScrollUp';

// `after`: markup the original template placed after <app-footer>.
export default function SiteChrome({ children, footer = true, after = null }) {
  return (
    <>
      <Navbar />
      {children}
      {footer && <Footer />}
      {after}
      <ScrollUp />
    </>
  );
}
