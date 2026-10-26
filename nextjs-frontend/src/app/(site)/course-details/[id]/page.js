'use client';


import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteChrome from '@/components/layout/SiteChrome';
import Scope from '@/components/common/Scope';
import SafeHtml from '@/components/common/SafeHtml';
import AccordionPanel from '@/components/course/AccordionPanel';
import PaidSeatModal from '@/components/course/PaidSeatModal';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { bsModal, dataToggleModal } from '@/components/bootstrap/bsModal';
import { courseService } from '@/services';
import { subscribe } from '@/lib/api';
import { fileUrl } from '@/lib/format';
import { useNgOnInit } from '@/lib/useNgOnInit';
import { dataService } from '@/lib/dataService';

const storage = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage unavailable */
    }
  },
  remove: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* storage unavailable */
    }
  },
};

export default function CourseDetailsPage({ params }) {
  const { id: productCode } = use(params);
  const router = useRouter();
  const { claims, ready, legacyDecodable } = useSession();
  const modalRef = useRef(null);

  const [products, setProducts] = useState(undefined);
  const [videoUrl, setVideoUrl] = useState(undefined);
  const [videoWait, setVideoWait] = useState(false);
  // Roles 3/6/5 (decoded from the token in ngOnInit) see Buy Now.
  const role = claims ? String(claims.role_id) : null;
  const showBuyButton = ready && !!claims && legacyDecodable && (role == '3' || role == '6' || role == '5');
  const [isChecked, setIsChecked] = useState(false);
  const quantity = 1;


  useNgOnInit(() => {
    if (claims) {

      if (!legacyDecodable) return;
    }
    subscribe(courseService.getProductDetails({ code: productCode }), (data) => {
      // handleProductDetails — statement order kept (a missing product throws at the same point).
      setProducts(data['products']);
      setVideoUrl(fileUrl(`files/product_video/${data['products'].product_video_file}`));
      setVideoWait(true);
      const product = data['products'];
      if (product['product_active'] != 'Approved') {
        if (product['product_type'] == 'B2B') router.push('/b2b-course');
        if (product['product_type'] == 'B2C') router.push('/course');
      }
    });
    subscribe(courseService.getComments({ code: productCode, count: 1 }), () => {});
  }, ready);

  // A route change while the modal is open leaves no backdrop/body class behind.
  useEffect(() => () => bsModal(modalRef.current)?.dispose(), []);

  const buyWithoutLogin = (code) => {
    storage.remove('paidCode');
    storage.set('loggedIn', 'Yes');
    alert('Kindly Login First');
    router.push('/login');
    storage.set('paidCode', code);
    // jQuery('#Login').modal('show') — no #Login element exists: no effect.
  };

  const applyForPaidCourse = () => {
    if (isChecked === undefined || isChecked == false) return;
    if (storage.get('code') !== null) storage.remove('code');
    storage.remove('paidCourse');
    bsModal(modalRef.current)?.hide();
    dataService.changeMessageForCodeForPayment(productCode);
    dataService.changeMessageForQuantity(quantity);
    if (quantity == 0) toastr.error('Quantity of a Product cannot be 0.');
    else router.push('/payment-redirect');
  };

  return (
    <SiteChrome after={<>{'4 '}</>}>
      <Scope name="course-details">
        <section className="detlBanrSec">
          <div className="container">
            <div className="row">
              <div className="col-md-9 col-xs-12 detlCarsDiv">
                <div className="video detlCarsDivIn">
                  {videoWait && (
                    <div>
                      <video controls id="video1" style={{ width: '100%', height: 'auto' }} autoPlay>
                        <source src={videoUrl} type="video/mp4" />
                      </video>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-md-3 col-xs-12 detlCarRgtDiv">
                <div className="detlCarRgtDivIn">
                  <div className="detlCarDivHdng">
                    <img src={fileUrl(`files/course_logo/${products?.course_logo_file}`)} />
                    <br /> ₹ {products?.price}
                  </div>
                  {showBuyButton && (
                    <div>
                      {/* [routerLink]="['']" resolves to the current route (no navigation); data-api opens the modal. */}
                      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- never navigates (preventDefault) */}
                      <a href="/" data-toggle="modal" data-target="#bookYourPaidSeat" className="btnFreeCvd" onClick={(e) => dataToggleModal(e, '#bookYourPaidSeat')}>
                        Buy Now
                      </a>
                    </div>
                  )}
                  {!showBuyButton && (
                    <div>
                      <a onClick={() => buyWithoutLogin(products?.code)} className="btnFreeCvd">
                        Enroll Now
                      </a>
                    </div>
                  )}
                  <div className="viewscount"> Total Views - {products?.view_counter} </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="mainCntLstSec">
          <div className="container">
            <div className="mainCntLstHdng"></div>
            <div className="mainCntLstSecIn">
              <div className="row">
                <div className="col-md-12 col-sm-12 col-xs-12 browsRgt">
                  <div className="prdctLstHdng">
                    <h2>{products?.course_name}</h2>
                  </div>
                  <div className="prdctCntDetl">
                    <h2>Product Highlights -</h2>
                    <SafeHtml as="p" html={products?.product_highlights} />
                    <br />
                    <br />
                    <SafeHtml as="p" html={products?.short_description} />
                    <br />
                    <br />
                    <h2>Requirements -</h2>
                    <SafeHtml as="p" html={products?.pre_requisites} />
                    <SafeHtml as="p" html={products?.requirements_description} />
                    <h2>Description -</h2>
                    <SafeHtml as="p" html={products?.description} />
                    <h2>Pre Requisites -</h2>
                    <SafeHtml as="p" html={products?.pre_requisites} />
                    <div className="lernCrsDivTbl">
                      <div className="panel-group" id="accordion" role="tablist" aria-multiselectable="true">
                        <AccordionPanel n="One" title=" Product Category " ariaExpanded="true" collapseClass="panel-collapse collapse in">
                          <p>{products?.product_category}</p>
                        </AccordionPanel>
                        <AccordionPanel n="Two" title=" FAQs " triggerClass="collapsed" ariaExpanded="false">
                          <SafeHtml as="p" html={products?.faqs} />
                        </AccordionPanel>
                        <AccordionPanel n="Three" title=" Refund Policy " triggerClass="collapsed" ariaExpanded="false">
                          <SafeHtml as="p" html={products?.refund_policy} />
                        </AccordionPanel>
                        <AccordionPanel n="Four" title=" Terms & Conditions " triggerClass="collapsed" ariaExpanded="false" ariaControls="collapseThree">
                          <SafeHtml as="p" html={products?.terms_conditions} />
                        </AccordionPanel>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Book Your Paid Seat Modal */}
        <PaidSeatModal ref={modalRef} isChecked={isChecked} setIsChecked={setIsChecked} onSubmit={applyForPaidCourse} />
      </Scope>
    </SiteChrome>
  );
}
