import Navbar from './Navbar';
import Footer from './Footer';
import ScrollUp from './ScrollUp';


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
