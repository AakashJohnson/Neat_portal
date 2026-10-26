'use client';


import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import SiteChrome from '@/components/layout/SiteChrome';
import { studentService } from '@/services';
import { subscribe } from '@/lib/api';
import { useBsCollapse } from '@/components/bootstrap/useBsCollapse';

const readSessionLanguage = () => {
  try {
    return sessionStorage.getItem('lang');
  } catch {
    return null;
  }
};

const noopSubscribe = () => () => {};

function FaqCard({ i, title, body }) {
  // data-parent="#accordion_i" on each card's own trigger.
  const { target, trigger, toggle } = useBsCollapse({ withParent: true });
  return (
    <div id={`accordion_${i}`} className="card">
      <div className="card-header">
        <h2 className="mb-0">
          <a ref={trigger} className="btn btn-link" data-toggle="collapse" data-parent={`#accordion_${i}`} href={`#collapseOne_${i}`} onClick={toggle}>
            {title}
          </a>
        </h2>
      </div>
      <div ref={target} id={`collapseOne_${i}`} className="collapse">
        <div className="card-body">
          {' '}
          {body}{' '}
        </div>
      </div>
    </div>
  );
}

export default function Faqs() {
  const pathname = usePathname();
  const role = pathname.split('-')[1];
  const [faqs, setFaqs] = useState(null);
  // languageEnglish starts true; 'ENGLISH' keeps it, 'HINDI' turns it off.
  const lang = useSyncExternalStore(noopSubscribe, readSessionLanguage, () => null);
  const languageEnglish = lang != 'HINDI';

  useEffect(() => {
    let alive = true;
    subscribe(studentService.getFaqs({ role }), (data) => {
      if (!alive) return;
      setFaqs(data);
    });
    return () => {
      alive = false;
    };
  }, [role]);

  const faqStudent = role == 'student';
  const faqCompany = role == 'companies';
  const faqInstitute = role == 'institutes';
  // *ngFor over a non-array (null before the response) renders nothing.
  const list = Array.isArray(faqs) ? faqs : [];

  return (
    <SiteChrome>
      <div className="about-page-area section-padding">
        <div className="container" style={{ marginBottom: '80px' }}>
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title mt-4" style={{ marginTop: '40px' }}>
                  {faqStudent && (
                    <div>
                      {languageEnglish && <h3>FAQs for Students</h3>}
                      {!languageEnglish && <h3>छात्र/लाभार्थी के लिए अक्सर पूछे जाने वाले प्रश्न</h3>}
                    </div>
                  )}
                  {faqInstitute && (
                    <div>
                      {languageEnglish && <h3>FAQs for Institutes</h3>}
                      {!languageEnglish && <h3>संस्थान के लिए अक्सर पूछे जाने वाले प्रश्न</h3>}
                    </div>
                  )}
                  {faqCompany && (
                    <div>
                      {languageEnglish && <h3>FAQs for Companies</h3>}
                      {!languageEnglish && <h3>कम्पनियों के लिए अक्सर पूछे जाने वाले प्रश्न{' '}</h3>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className=" row">
            <div className="col-lg-12 col-md-12 col-12">
              <div className="accordion ">
                {list.map((faq, i) =>
                  languageEnglish ? (
                    <FaqCard key={`en-${i}`} i={i} title={faq?.title} body={faq?.body} />
                  ) : (
                    <FaqCard key={`hi-${i}`} i={i} title={faq?.title_hindi} body={faq?.body_hindi} />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}
