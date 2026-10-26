'use client';


import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import SafeHtml from '@/components/common/SafeHtml';
import AccordionPanel from '@/components/course/AccordionPanel';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { courseService, studentService } from '@/services';
import { subscribe } from '@/lib/api';
import { fileUrl } from '@/lib/format';
import { dataService } from '@/lib/dataService';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function StudentCourseDetailsPage({ params }) {
  const { id: productCode } = use(params);
  const router = useRouter();
  const { claims, ready, legacyDecodable } = useSession();
  const [products, setProducts] = useState(undefined);
  const [videoUrl, setVideoUrl] = useState(undefined);
  const [videoWait, setVideoWait] = useState(false);

  useNgOnInit(() => {
    if (claims && !legacyDecodable) return; // inline atob decode threw
    subscribe(courseService.getProductDetails({ code: productCode }), (data) => {
      setProducts(data['products']);
      setVideoUrl(fileUrl(`files/product_video/${data['products'].product_video_file}`));
      setVideoWait(true);
    });
  }, ready);

  const availFreeSeat = (code) => {
    subscribe(studentService.sendFreeSeatVerificationMail({ code }), (data) => {
      if (data['message'] == 'Success') {
        toastr.success('Check Your E-Mail for verification Code');
        dataService.changeMessageForFreeSeatCode(productCode);
        router.push('/student/free-seat-verification');
      }
    });
  };

  return (
    <>
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
                  <br /> Free
                </div>
                <div>
                  <a onClick={() => availFreeSeat(products?.code)} className="btnFreeCvd">
                    Avail Free Seat
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
                  <h2>Product Highlights -</h2> {products?.product_highlights}
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
    </>
  );
}
