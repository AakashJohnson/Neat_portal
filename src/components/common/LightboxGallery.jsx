'use client';
// Image grid + #myModal lightbox shared by the gallery pages. Replaces the
// global functions of src/assets/js/modal.js (openModal, closeModal,
// plusSlides, currentSlide) with component state; wrap-around is the same as
// showSlides(): past the last slide → 1, before the first → last.
// modal.js also wrote to non-existent ".demo" dots and "#caption" (throwing a
// TypeError after showing the slide); that part had no visible effect and is not ported.
import { useState } from 'react';

/**
 * @param {{ thumbs: { src: string, slide: number, alt?: string }[],
 *           slides: { src: string, label: string|number }[] }} props
 *   thumbs[].slide: the 1-based slide the original click handler opened.
 */
export default function LightboxGallery({ thumbs, slides }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(null); // null until showSlides() first ran

  const show = (n) => setIndex(n > slides.length ? 1 : n < 1 ? slides.length : n);

  return (
    <>
      <div className="row m-4">
        {thumbs.map((thumb, i) => (
          <div className="col-lg-4 col-md-6 mb-30" key={i}>
            <div className="gallery-img">
              <img
                src={thumb.src}
                style={{ maxWidth: '100%', height: 'auto' }}
                onClick={() => {
                  setOpen(true);
                  show(thumb.slide);
                }}
                className="hover-shadow cursor"
                {...(thumb.alt !== undefined ? { alt: thumb.alt } : {})}
              />
            </div>
          </div>
        ))}
      </div>

      <div id="myModal" className="modal" style={open ? { display: 'block' } : index !== null ? { display: 'none' } : undefined}>
        <span className="close cursor" onClick={() => setOpen(false)}>
          &times;
        </span>
        <div className="modal-content">
          {slides.map((slide, i) => (
            <div className="hover-effect mySlides frame-square3" key={i} style={index === null ? undefined : { display: index === i + 1 ? 'block' : 'none' }}>
              <div className="zoom-icon crop3">
                <div className="numbertext">{slide.label}</div>
                <img src={slide.src} style={{ maxWidth: '100%', height: 'auto' }} />
              </div>
            </div>
          ))}
          <a className="prev" onClick={() => show(index - 1)}>
            &#10094;
          </a>
          <a className="next" onClick={() => show(index + 1)}>
            &#10095;
          </a>
        </div>
      </div>
    </>
  );
}
