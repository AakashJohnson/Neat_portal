'use client';
// jQuery scrollUp plugin from assets/theme/js/main.js: a fixed "#scrollUp"
// button (styled by the theme CSS) that fades in after scrolling.
import { useEffect, useState } from 'react';

export default function ScrollUp() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <a
      id="scrollUp"
      href="#top"
      aria-label="Scroll to top"
      style={{ position: 'fixed', zIndex: 2147483647, display: visible ? 'block' : 'none' }}
      onClick={(e) => {
        e.preventDefault();
        window.scrollTo({ top: 0 });
      }}
    >
      <i className="fa fa-angle-up"></i>
    </a>
  );
}
