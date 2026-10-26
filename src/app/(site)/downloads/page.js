'use client';


import Link from 'next/link';
import SiteChrome from '@/components/layout/SiteChrome';
import Scope from '@/components/common/Scope';
import { useI18n } from '@/components/providers/I18nProvider';
import { useState } from 'react';
import imageNames from '../../../../public/assets/img/downloads/ImageName.json';

const TYPE_IMAGES = {
  Woman: ['4.jpg', '5.jpg', '6.jpg', '9.jpg', '14.jpg', '19.jpg', '49.jpg'],
  Students: ['3.jpg', '8.jpg', '10.jpg', '13.jpg', '18.jpg', '20.jpg', '21.jpg', '24.jpg', '26.jpg', '28.jpg', '30.jpg', '32.jpg', '33.jpg', '34.jpg', '35.jpg', '37.jpg', '38.jpg', '48.jpg', '50.jpg'],
  Institution: ['1.jpg', '7.jpg', '11.jpg', '12.jpg', '15.jpg', '16.jpg', '29.jpg', '40.jpg', '44.jpg', '47.jpg'],
};

const scrollToTop = () => window.scroll(0, 0);

export default function DownloadsPage() {
  const { t } = useI18n();
  const [images, setImages] = useState(() => Object.keys(imageNames.Images ?? {}));
  const [display, setDisplay] = useState({}); // inline style.display per slide (by image name)
  const [modalOpen, setModalOpen] = useState(null); // null: never toggled (no inline style)
  const [slideIndex, setSlideIndex] = useState(1); // modal.js global

  // modal.js showSlides(n) over the given (currently rendered) list.
  const showSlides = (list, n) => {
    let index = n;
    if (n > list.length) index = 1;
    if (n < 1) index = list.length;
    setSlideIndex(index);
    const next = Object.fromEntries(list.map((img) => [img, 'none']));
    if (list[index - 1] !== undefined) next[list[index - 1]] = 'block';
    setDisplay(next);
  };

  // Replacing the list: slides whose names leave it are destroyed (state dropped).
  const replaceImages = (list) => {
    setImages(list);
    setDisplay((d) => Object.fromEntries(Object.entries(d).filter(([k]) => list.includes(k))));
  };

  const onClick = (n, type) => {
    const nextList = TYPE_IMAGES[type] ?? images;
    setModalOpen(true);
    showSlides(images, n);
    replaceImages(nextList);
  };
  const closeModal = () => setModalOpen(false);
  const plusSlides = (n) => showSlides(images, slideIndex + n);

  return (
    <SiteChrome>
      <Scope name="downloads">
        <div className="about-page-area section-padding">
          <div className="container">
            <div className="row">
              <div className="col-md-12">
                <div className="section-title-wrapper">
                  <div className="section-title">
                    <h3 style={{ marginTop: "40px" }}>
                      {t('DOWNLOADS.TITLE')}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            <div className="announcement-section">
              <div className="container">
                <div className="row">
                  <div className="col-md-4">
                    <div className="success-section">
                      <h4>
                        {t('Woman Empowerment')}
                      </h4>
                      <div className="row">
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/woman-empowerment-download/4.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(4, 'Woman'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/woman-empowerment-download/5.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(5, 'Woman'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/woman-empowerment-download/6.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(6, 'Woman'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/woman-empowerment-download/9.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(9, 'Woman'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                      </div>
                      <div className="aligncenter">
                        <Link href="/woman-empowerment-gallery" onClick={(e) => { scrollToTop(); }} style={{ color: "white" }} className="org-button mt-4">
                          {t('ANNOUNCEMENT.VIEW_ALL')}
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="success-section">
                      <h4>
                        {t('Students / Learners')}
                      </h4>
                      <div className="row">
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/student-learners-download/3.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(3, 'Students'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/student-learners-download/8.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(8, 'Students'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/student-learners-download/10.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(10, 'Students'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/student-learners-download/13.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(13, 'Students'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                      </div>
                      {/* <div class="aligncenter"><a  style="color:white;" class="org-button mt-4">{{ 'ANNOUNCEMENT.VIEW_ALL' | translate}}</a></div> */}
                      <div className="aligncenter">
                        <Link href="/student-learners-gallery" onClick={(e) => { scrollToTop(); }} style={{ color: "white" }} className="org-button mt-4">
                          {t('ANNOUNCEMENT.VIEW_ALL')}
                        </Link>
                      </div>
                      {/* student-learners-gallery */}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="success-section">
                      <h4>
                        {t('Institution')}
                      </h4>
                      <div className="row">
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/institution-download/7.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(7, 'Institution'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/institution-download/11.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(11, 'Institution'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/institution-download/12.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(12, 'Institution'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img">
                            <img src="/assets/img/institution-download/15.jpg" style={{ maxWidth: "100%", height: "auto" }} onClick={(e) => { onClick(15, 'Institution'); }} className="hover-shadow cursor" />
                          </div>
                        </div>
                        {/* <div class="col-6 mb-2">
                                    <div class="gallery-img">
                                        <img src="../../../../assets/img/institution-download/6.jpg"
                                            style="max-width:100%; height: auto;" (click)="onClick(5)"
                                            class="hover-shadow cursor">
                                    </div>
                                </div> */}
                      </div>
                      <div className="aligncenter">
                        <Link href="/institution-gallery" onClick={(e) => { scrollToTop(); }} style={{ color: "white" }} className="org-button mt-4">
                          {t('ANNOUNCEMENT.VIEW_ALL')}
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="success-section">
                      <h4>
                        {t('User Manual')}
                      </h4>
                      <div className="row">
                        <div className="col-6 mb-2">
                          <div className="gallery-img boder2">
                            <a href="/assets/img/user-manual-download/NEAT-learner-manual.pdf" target="_blank">
                              <img src="/assets/img/user-manual-download/322.jpg" style={{ maxWidth: "100%", height: "auto" }} className="hover-shadow cursor" />
                            </a>
                          </div>
                        </div>
                        <div className="col-6 mb-2">
                          <div className="gallery-img boder2">
                            <a href="/assets/img/user-manual-download/NEAT-student-manual.pdf" target="_blank">
                              <img src="/assets/img/user-manual-download/323.jpg" style={{ maxWidth: "100%", height: "auto" }} className="hover-shadow cursor" />
                            </a>
                          </div>
                        </div>
                        {/* <div class="col-6 mb-2">
                                    <div class="gallery-img">
                                      <img src="../../../../assets/img/user-manual-download/34.jpg"
                                            style="max-width:100%; height: auto;" (click)="onClick(3)"
                                            class="hover-shadow cursor">
                                    </div>
                                </div> */}
                      </div>
                      {/* <div class="aligncenter"><a routerLink="/user-manual-gallery" (click)="scrollToTop()" style="color:white;"
                                    class="org-button mt-4">{{ 'ANNOUNCEMENT.VIEW_ALL' | translate}}</a></div> */}
                    </div>
                  </div>
                  <div id="myModal" className="modal" style={modalOpen === null ? undefined : { display: modalOpen ? 'block' : 'none' }}>
                    <span className="close cursor" onClick={(e) => { closeModal(); }}>
                      ×
                    </span>
                    <div className="modal-content">
                      {(images ?? []).map((image, i) => (
                        <div key={image} className="hover-effect mySlides" style={display[image] ? { display: display[image] } : undefined}>
                        <div className="zoom-icon">
                          <div className="numbertext">
                            {i} = {image}
                          </div>
                          <img src={`/assets/img/downloads/${image}`} style={{ maxWidth: "100%", height: "auto" }} />
                        </div>
                      </div>
                      ))}
                      <a className="prev" onClick={(e) => { plusSlides(-1); }}>
                        ❮
                      </a>
                      <a className="next" onClick={(e) => { plusSlides(1); }}>
                        ❯
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Scope>
    </SiteChrome>
  );
}
