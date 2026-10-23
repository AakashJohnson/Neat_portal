'use client';
// Port of app/components/pages/disclaimer/disclaimer.component.{html,ts}
import SiteChrome from '@/components/layout/SiteChrome';
import { useI18n } from '@/components/providers/I18nProvider';

export default function DisclaimerPage() {
  const { t } = useI18n();
  return (
    <SiteChrome>
      <div className="about-page-area section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title">
                  <h3 style={{ marginTop: "40px" }}>
                    {t('DISCLAIMER.DISCLAIMER')}
                  </h3>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-12 col-md-12 col-12">
              <div className="about-text-container" style={{ marginBottom: "40px" }}>
                <h5>
                  Disclaimers for Learners
                </h5>
                <p>
                  MoE/ AICTE would have no responsibility towards the non-Government organizations in meeting the claims made by them about their products and Products.
                </p>
                <p>
                  MoE/AICTE has no intervention in pricing of the products displayed on the portal.
                </p>
                <p>
                  The purpose of the website is only to facilitate reskilling to the citizens of the country, facilitate personalized learning through AI based Products and to support the economically disadvantaged section of students.
                </p>
                <p>
                  Only the Products and products displayed on the portal are endorsed by MoE/AICTE. Any product/solution by the same organization, not showcased on the portal is not to be considered as endorsed, just because it is from the same organization.
                </p>
                <p>
                  As this is an ongoing process, new Products would be displayed and included on the NEAT portal on a regular basis.
                </p>
                <p>
                  Students have to ensure that they are capable of making payments through the Company gateway available for each solution.
                </p>
                <p>
                  AICTE is not responsible for any slow speed of network at the learner end for use of Products showcased on NEAT portal.
                </p>
                <p>
                  It is the responsibility of the learner to ensure that the minimum infrastructure required for the product is available with the learner to effectively use the solution.
                </p>
                <br />
                <br />
                <h5>
                  Disclaimers for Companies
                </h5>
                <p>
                  The data about eligible students is shared by the educational institutions and the accuracy of the data is verified by the respective educational institutions only.
                </p>
                <p>
                  MoE/ AICTE would have no role in any litigation between the learner and company.
                </p>
                <p>
                  MoE/ AICTE are not responsible for the loss of goodwill of company in case of termination of MoU for any of their products. The intent of the NEAT portal is only to bring Products needed by learners on a common platform. In case of termination of MoU because of non-compliance, a justification would be given to the company for termination, along with a non-compliance report.
                </p>
                <p>
                  In case of any legal non-compliance by the company, or taxation issues, which make the company ineligible to be endorsed by MoE, the MoU would be terminated/ not renewed.
                </p>
                <p>
                  The use of the name, logo and/or official emblem of any of the parties on any publication, document and/or paper is allowed only, after seeking explicit prior permission in writing/email by either party.
                </p>
                <br />
                <br />
                <h5>
                  Disclaimers for website
                </h5>
                <p>
                  This website is designed, develop and maintained by e-Governance, AICTE.
                </p>
                <p>
                  Though all efforts have been made to ensure the accuracy and currency of the content on this website, the same should not be construed as a statement of law or used for any legal purposes. In case of any ambiguity or doubts, users are advised to verify/check with AICTE and/or other source(s), and to obtain appropriate professional advice.
                </p>
                <p>
                  Under no circumstances will the department be liable for any expense, or loss or damage including, without limitation, indirect or consequential loss or damage, or any expense, loss or damage whatsoever arising from use, or loss of use, of data, arising of or in connection with the use of this website.
                </p>
                <p>
                  These terms and conditions shall be governed by and construed in accordance with the Indian laws. Any dispute arising under these terms and conditions shall be subject to the jurisdiction of the courts of India.
                </p>
                <p>
                  The information posted on this website could include hypertext links or pointers to information created and maintained by non-Government/private organizations. MoE/ AICTE is only endorsing these Products for the correctness of their content.{' '}
                </p>
                <p>
                  When you select a link to an outside website, you are leaving the NEAT portal and are subject to the privacy and security policies of the owners/sponsors of the outside website.{' '}
                </p>
                <p>
                  MoE/ AICTE does not guarantee that linked websites comply with Indian Government Web Guidelines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}

