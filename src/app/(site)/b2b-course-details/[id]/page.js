'use client';
// Port of components/pages/b2b-course-details/b2b-course-details.component.{html,ts}
// (B2B product page): "Send Enquiry" opens #sendEnquiryYourPaidSeat, whose
// form is submitted without validation (validators commented out in the
// original; `required` attributes are inert under novalidate). The
// #bookYourPaidSeat modal is still in the template, with no trigger.
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
import { useFormGroup } from '@/lib/forms';
import { dataService } from '@/lib/dataService';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function B2bCourseDetailsPage({ params }) {
  const { id: productCode } = use(params);
  const router = useRouter();
  const { claims, ready, legacyDecodable } = useSession();
  const paidModalRef = useRef(null);
  const enquiryModalRef = useRef(null);

  const form = useFormGroup({
    college_name: [''],
    college_representative_name: [''],
    designation: [''],
    no_of_seats: [''],
    mobile_number: [''],
    neat_id: [''],
    product_code: [''],
    message: [''],
    college_email: [''],
  });
  const [products, setProducts] = useState(undefined);
  const [videoUrl, setVideoUrl] = useState(undefined);
  const [videoWait, setVideoWait] = useState(false);
  const [showDisTable, setShowDisTable] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const quantity = 1;

  useNgOnInit(() => {
    // Angular decoded the token inline; a payload its atob() cannot read threw here.
    if (claims && !legacyDecodable) return;
    subscribe(courseService.getProductDetails({ code: productCode }), (data) => {
      // handleProductDetails — statement order kept.
      setProducts(data['products']);
      setVideoUrl(fileUrl(`files/product_video/${data['products'].product_video_file}`));
      setVideoWait(true);
      form.patchValue({ neat_id: data['products'].neat_id, product_code: data['products'].code });
      const product = data['products'];
      setShowDisTable(product['b2b_discount_table_uploaded'] == 'Yes');
      if (product['product_active'] != 'Approved') {
        if (product['product_type'] == 'B2B') router.push('/b2b-course');
        if (product['product_type'] == 'B2C') router.push('/course');
      }
    });
    subscribe(courseService.getComments({ code: productCode, count: 1 }), () => {});
  }, ready);

  useEffect(
    () => () => {
      bsModal(paidModalRef.current)?.dispose();
      bsModal(enquiryModalRef.current)?.dispose();
    },
    [],
  );

  const applyForPaidCourse = () => {
    if (isChecked === undefined || isChecked == false) return;
    try {
      if (localStorage.getItem('code') !== null) localStorage.removeItem('code');
      localStorage.removeItem('paidCourse');
    } catch {
      /* storage unavailable */
    }
    bsModal(paidModalRef.current)?.hide();
    dataService.changeMessageForCodeForPayment(productCode);
    dataService.changeMessageForQuantity(quantity);
    if (quantity == 0) toastr.error('Quantity of a Product cannot be 0.');
    else router.push('/payment-redirect');
  };

  const onSubmit = (values) => {
    subscribe(courseService.submitB2BEnquiry(values), (data) => {
      if (data['message'] == 'Success') toastr.success(data['reason']);
      else toastr.error(data['reason']);
    });
  };

  const field = (name, placeholder) => (
    <div className="form-group">
      <input type="text" className="form-control" {...form.bind(name)} required placeholder={placeholder} />
    </div>
  );

  return (
    <SiteChrome>
      <Scope name="b2b-course-details">
        <section className="detlBanrSec">
          <div className="container">
            <div className="row">
              <div className="col-md-9 col-xs-12 detlCarsDiv">
                <div className="detlCarsDivIn">
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
                    <br />
                  </div>
                  <div>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- never navigates (preventDefault) */}
                    <a href="/" data-toggle="modal" data-target="#sendEnquiryYourPaidSeat" className="btnFreeCvd" onClick={(e) => dataToggleModal(e, '#sendEnquiryYourPaidSeat')}>
                      Send Enquiry
                    </a>
                  </div>
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
                          <p>{products?.product_bucket}</p>
                        </AccordionPanel>
                        <AccordionPanel n="Two" title=" FAQs " triggerClass="collapsed" ariaExpanded="false">
                          <SafeHtml as="p" html={products?.faqs} />
                        </AccordionPanel>
                        <AccordionPanel n="Three" title=" Refund Policy " triggerClass="collapsed" ariaExpanded="false">
                          <SafeHtml as="p" html={products?.refund_policy} />
                        </AccordionPanel>
                        <AccordionPanel n="Four" title=" Terms & Conditions " triggerClass="collapsed" ariaExpanded="false">
                          <SafeHtml as="p" html={products?.terms_conditions} />
                        </AccordionPanel>
                        {showDisTable && (
                          <div>
                            <AccordionPanel n="Five" title=" Discount  Table " triggerClass="collapsed" ariaExpanded="false">
                              <img src={fileUrl(`files/b2b_discount_table/${products?.b2b_discount_table_file}`)} />
                              <br />
                            </AccordionPanel>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Book Your Paid Seat Modal */}
        <PaidSeatModal ref={paidModalRef} isChecked={isChecked} setIsChecked={setIsChecked} onSubmit={applyForPaidCourse} />

        {/* Send Enquiry Modal */}
        <div ref={enquiryModalRef} className="modal fade" id="sendEnquiryYourPaidSeat" tabIndex="-1" role="dialog" aria-labelledby="login-modal" aria-hidden="true">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title login-title" id="login-modal">
                  Send Enquiry
                </h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>
                  NEAT is an initiative of MoE (Implementing Agency AICTE) to provide a platform of leaning in upcoming and state of art technology areas through online courses being offered by
                  industry. Solutions that Ed-Tech MoE/AICTE doesn&apos;t guarantee any employment.
                </p>
                <form
                  noValidate
                  className="login-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    form.markSubmitted();
                    onSubmit(form.value);
                  }}
                >
                  {field('college_name', 'College/University Name')}
                  {field('college_representative_name', 'College/University Representative Name')}
                  {field('designation', 'Designation')}
                  {field('college_email', 'Email')}
                  {field('no_of_seats', 'No Of Seats Required')}
                  {field('mobile_number', 'Mobile Number')}
                  <div className="form-group">
                    <textarea className="form-control textArea" {...form.bind('message')} required placeholder="Message"></textarea>
                  </div>
                  <div className="form-check">
                    <input type="hidden" {...form.bind('product_code')} />
                    <input type="hidden" {...form.bind('neat_id')} />
                    <button type="submit" className="btn btn-login float-right" style={{ background: '#EF7E22', color: '#fff', fontWeight: 600, fontFamily: 'poppins, sans-serif' }}>
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Scope>
    </SiteChrome>
  );
}
