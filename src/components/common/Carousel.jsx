'use client';
// Bootstrap 4 carousel (data-ride="carousel") without jQuery: same markup and
// classes, so the theme CSS applies; auto-advances every 5 s like bootstrap.js.
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @param {{ id: string, slides: React.ReactNode[], indicators?: number, controls?: boolean,
 *           interval?: number, className?: string, innerProps?: object }} props
 *   indicators — number of indicator dots to render (the original markup sometimes
 *   renders fewer dots than slides; that is preserved).
 */
export default function Carousel({ id, slides, indicators = 0, controls = false, interval = 5000, className = 'carousel slide', innerProps = {} }) {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const count = slides.length;
  const go = useCallback((n) => setIndex(((n % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2) return undefined;
    const t = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, interval);
    return () => clearInterval(t);
  }, [count, interval]);

  return (
    <div className={className} id={id} onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}>
      {indicators > 0 && (
        <ol className="carousel-indicators">
          {Array.from({ length: indicators }, (_, i) => (
            <li key={i} className={i === index ? 'active' : undefined} onClick={() => go(i)} />
          ))}
        </ol>
      )}
      <div className="carousel-inner" {...innerProps}>
        {slides.map((slide, i) => (
          <div key={i} className={`carousel-item${i === index ? ' active' : ''}`}>
            {slide}
          </div>
        ))}
      </div>
      {controls && (
        <>
          <a href={`#${id}`} className="carousel-control-prev" role="button" onClick={(e) => { e.preventDefault(); go(index - 1); }}>
            <span className="carousel-control-prev-icon"></span>
            <span className="sr-only" aria-hidden="true">Prev</span>
          </a>
          <a href={`#${id}`} className="carousel-control-next" role="button" onClick={(e) => { e.preventDefault(); go(index + 1); }}>
            <span className="carousel-control-next-icon"></span>
            <span className="sr-only" aria-hidden="true">Next</span>
          </a>
        </>
      )}
    </div>
  );
}
