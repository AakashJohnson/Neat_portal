'use client';
// Port of components/shared/footer/footer.component.{html,ts}.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { roleOf, useSession } from '@/components/providers/SessionProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import Scope from '@/components/common/Scope';

const scrollToTop = () => window.scroll(0, 0);

const L = ({ href, children }) => (
  <li>
    <Link href={href} onClick={scrollToTop}>
      {children}
    </Link>
  </li>
);

export default function Footer() {
  const { t } = useI18n();
  const { claims } = useSession();
  const router = useRouter();

  // footer.component.ts redirect(): students → /student, institutes → /institute.
  // DEV-F01: logged-out visitors were meant to see a "#Login" modal that does
  // not exist in the Angular app (the click did nothing); they go to /login.
  const redirect = (e) => {
    e.preventDefault();
    const role = roleOf(claims);
    if (!claims) router.push('/login');
    else if (role === '3') router.push('/student');
    else if (role === '5') router.push('/institute');
  };

  return (
    <Scope name="footer">
    <footer className="footer-area">
      <div className="container">
        <div className="row justify-content-between">
          <div className="col-sm-6 col-md-3 col-xl-3">
            <div className="single-footer-widget footer_1">
              <h4>{t('DISCLAIMER.DISCLAIMER')}</h4>
              <p>{t('DISCLAIMER.INITIATIVE')}</p>
            </div>
          </div>
          <div className="col-sm-6 col-md-3 col-xl-3">
            <div className="single-footer-widget footer_1">
              <ul>
                <L href="/aboutNeat">{t('FOOTER.NEAT')}</L>
                <li>
                  <a href="#" onClick={redirect}>
                    {t('NAVBAR.STUDENT/BENEFICIARY')}
                  </a>
                </li>
                <li>
                  <a href="#" onClick={redirect}>
                    {t('FOOTER.COURSE_PROVIDER')}
                  </a>
                </li>
                <li>
                  <a href="#" onClick={redirect}>
                    {t('NAVBAR.INSTITUTES')}
                  </a>
                </li>
                <L href="/gallery-photo">{t('FOOTER.GALLERY_PHOTO')}</L>
                <L href="/gallery-video">{t('FOOTER.GALLERY_VIDEO')}</L>
                <L href="/contact-us">{t('FOOTER.CONTACT_US')}</L>
              </ul>
            </div>
          </div>
          <div className="col-sm-6 col-md-3 col-xl-3">
            <div className="single-footer-widget footer_1">
              <ul>
                <L href="/grievance">{t('FOOTER.GRIEVANCE')}</L>
                <L href="/downloads">{t('FOOTER.DOWNLOADS')}</L>
                <L href="/feedback">{t('FOOTER.FEEDBACK')}</L>
                <li>
                  <Link href="/">{t('FOOTER.PRIVACY')}</Link>
                </li>
                <L href="/disclaimer">{t('DISCLAIMER.DISCLAIMER')}</L>
                {/* The linked file does not exist in the Angular app either (see legacy-assets-report). */}
                <L href="/assets/Free_Seats_as_per_reservation.xlsx">NEAT Free Coupons Statistics</L>
                <li>
                  <a href="https://neatphase2eoi.aicte-india.org/" target="_blank" rel="noreferrer" onClick={scrollToTop}>
                    <span className="blink">Expression of Interest-NEAT 6.0</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="col-xl-3 col-sm-6 col-md-3">
            <div className="single-footer-widget footer_2">
              <ul>
                {[
                  ['https://www.india.gov.in/', 'india.gov.in'],
                  ['https://mhrd.gov.in/', t('FOOTER.MHRD')],
                  ['https://www.aicte-india.org/', t('FOOTER.AICTE')],
                  ['https://www.ncs.gov.in/Pages/default.aspx', t('FOOTER.NCS')],
                  ['https://swayam.gov.in/', t('FOOTER.SWAYAM')],
                  ['https://www.ugc.ac.in/', t('FOOTER.UGC')],
                  ['https://www.sih.gov.in/', t('FOOTER.SIH')],
                  ['https://mic.gov.in/mic/', t('FOOTER.MHRD_INNOVATION')],
                  ['http://mhrdnats.gov.in/', t('FOOTER.NATS')],
                  ['https://www.mygov.in/', 'mygov.in'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a href={href} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-12">
            <div className="copyright_part_text text-center">
              <div className="row">
                <div className="col-lg-12">
                  <p className="footer-text m-0">
                    Copyright &copy; AICTE 2021.All right reserved.Created by{' '}
                    <a href="https://aicte-india.org/" target="_blank" rel="noreferrer" style={{ color: '#fff' }}>
                      AICTE
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
    </Scope>
  );
}
