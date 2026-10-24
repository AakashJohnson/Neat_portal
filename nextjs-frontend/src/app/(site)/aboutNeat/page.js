'use client';
// Port of app/components/pages/about-us/about-us.component.{html,ts}
import SiteChrome from '@/components/layout/SiteChrome';
import Scope from '@/components/common/Scope';
import { useI18n } from '@/components/providers/I18nProvider';

export default function AboutUsPage() {
  const { t } = useI18n();
  return (
    <SiteChrome>
      <Scope name="about-us">
        {/* learning part start */}
        <section className="learning_part abtNeatSec">
          <div className="container">
            <div className="row align-items-sm-center align-items-lg-stretch">
              <div className="col-md-7 col-lg-7 abtNeatImg">
                <div className="learning_img imggap">
                  <p>
                    {'\u00a0'}
                  </p>
                  <img src="/assets/img/aicteBuilding.png" alt="" />
                </div>
              </div>
              <div className="col-md-5 col-lg-5 abtNeatCnt">
                <div className="learning_member_text">
                  <h5>
                    About NEAT
                  </h5>
                  <h2>
                    {'\u00a0'}
                  </h2>
                  <p>
                    {t('ABOUTUS.ABOUT_NEAT1')}
                  </p>
                </div>
              </div>
              <div className="col-md-12 col-lg-12 abtNeatCnt">
                <div className="learning_member_text">
                  <p>
                    {t('ABOUTUS.ABOUT_NEAT2')}
                  </p>
                  <p>
                    {t('ABOUTUS.ABOUT_NEAT3')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Scope>
    </SiteChrome>
  );
}

