'use client';


import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { roleOf, useSession } from '@/components/providers/SessionProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import Scope from '@/components/common/Scope';

const scrollToTop = () => window.scrollTo(0, 0);


function Dropdown({ label, children, href = '#', trailingSpace = true }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`nav-item dropdown${open ? ' show' : ''}`} onMouseLeave={() => setOpen(false)}>
      <a
        className="nav-link dropdown-toggle"
        href={href}
        role="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        {` ${label}${trailingSpace ? ' ' : ''}`}
      </a>
      <div className={`dropdown-menu${open ? ' show' : ''}`} onClick={() => setOpen(false)}>
        {children}
      </div>
    </li>
  );
}

const Item = ({ href, children }) => (
  <Link className="dropdown-item" href={href} onClick={scrollToTop}>
    {children}
  </Link>
);

export default function Navbar() {
  const { claims, logout } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const role = roleOf(claims);

  const onLogout = async (e) => {
    e.preventDefault();
    await logout();
    router.push('/login');
  };

  return (
    <Scope name="navbar">
    <header className="main_menu home_menu">
      <div className="hdrTpDiv">
        <div className="container">
          <div className="row">
            <div className="col-md-6 col-sm-6 col-xs-6 tpTm">
              <div className="tpTmIn">
                <span>
                  <i className="fa fa-envelope-o" aria-hidden="true"></i>
                  <a href="mailTo:neat@aicte-india.org"> neat@aicte-india.org</a>
                </span>
                <span>
                  <i className="fa fa-phone" aria-hidden="true"></i>
                  <a href="callTo:011-29581423"> 011-29581423</a>
                </span>
              </div>
            </div>
            <div className="col-md-6 col-sm-6 col-xs-6 indFlg">
              <div className="indFlgIn">
                <img src="/assets/img/indianFlag.gif" alt="Indian flag" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hdrLogoDiv">
        <div className="container">
          <div className="row">
            {[
              ['logoMhrd', '/assets/img/MHRD_new_logo_2.png', 'Ministry of Education'],
              ['logoNeat', '/assets/img/neat-logo-top.png', 'NEAT'],
              ['logoAicte', '/assets/img/aicte-logo-top.png', 'AICTE'],
              ['logoAicte', '/assets/img/g20logo.png', 'G20'],
            ].map(([cls, src, alt]) => (
              <div key={src} className={`col-md-3 col-sm-3 col-xs-12 lgOne ${cls}`}>
                <div className="lgOneIn">
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    <img src={src} alt={alt} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="hdrMenuDiv">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-12">
              <nav className="navbar navbar-expand-lg navbar-light">
                <button className="navbar-toggler" type="button" aria-controls="navbarSupportedContent" aria-expanded={!collapsed} aria-label="Toggle navigation" onClick={() => setCollapsed((c) => !c)}>
                  <span className="navbar-toggler-icon"></span>
                </button>

                <div className={`collapse navbar-collapse main-menu-item justify-content-end${collapsed ? '' : ' show'}`} id="navbarSupportedContent">
                  <ul className="navbar-nav align-items-center">
                    <li className="nav-item">
                      {                                                                                           }
                      <Link className="nav-link" href="/" onClick={scrollToTop}>
                        {t('NAVBAR.HOME')}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" href="/aboutNeat" onClick={scrollToTop}>
                        {t('NAVBAR.NEAT')}
                      </Link>
                    </li>

                    {role === '3' && (
                      <Dropdown label={t('NAVBAR.STUDENT/BENEFICIARY')}>
                        <Item href="/student">Student Details</Item>
                        <Item href="/student/paid-Products-details-checkout">Purchased Courses</Item>
                        <Item href="/student/free-Products-details-checkout">Free Courses</Item>
                      </Dropdown>
                    )}

                    {role === '6' && (
                      <Dropdown label="Learner">
                        <Item href="/learner">Learner Details</Item>
                        <Item href="/learner/learner-paid-course">Purchased Courses</Item>
                        <Item href="/learner/learner-free-course">Free Courses</Item>
                      </Dropdown>
                    )}

                    <li className="nav-item">
                      <Link className="nav-link" href="/course" onClick={scrollToTop}>
                        B2C Products
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" href="/b2b-course" onClick={scrollToTop}>
                        B2B Products
                      </Link>
                    </li>

                    {role === '5' && (
                      <li className="nav-item">
                        <Link className="nav-link" href="/institute" onClick={scrollToTop}>
                          {t('NAVBAR.INSTITUTES')}
                        </Link>
                      </li>
                    )}
                    {role === '4' && (
                      <Dropdown label={t('NAVBAR.COMPANY')} trailingSpace={false}>
                        <Item href="/company">{t('NAVBAR.COMPANY')}</Item>
                        <Item href="/company/company-details">{t('NAVBAR.COMPANY_DETAILS')}</Item>
                      </Dropdown>
                    )}

                    <Dropdown label={t('NAVBAR.FAQS')}>
                      <Item href="/faqs-student">
                        {`${t('NAVBAR.STUDENT/BENEFICIARY')} ${t('NAVBAR.FAQS')}`}
                      </Item>
                      <Item href="/faqs-companies">
                        {`${t('NAVBAR.COMPANY')} ${t('NAVBAR.FAQS')}`}
                      </Item>
                      <Item href="/faqs-institutes">
                        {`${t('NAVBAR.INSTITUTES')} ${t('NAVBAR.FAQS')}`}
                      </Item>
                    </Dropdown>

                    <li className="nav-item">
                      {role === '1' && (
                        <Link className="nav-link" href="/admin" onClick={scrollToTop}>
                          {t('NAVBAR.DASHBOARD')}
                        </Link>
                      )}
                    </li>

                    <li className="nav-item">
                      <a className="nav-link" href="https://neateoi.aicte-india.org/" target="_blank" rel="noreferrer">
                        <span className="blink">Expression of Interest-NEAT 6.2</span>
                      </a>
                    </li>
                  </ul>
                </div>

                {role === '' ? (
                  <div className="loginRegsDiv">
                    <ul>
                      <li>
                        <Link href="/login" onClick={scrollToTop}>
                          Login
                        </Link>
                      </li>
                      <li>
                        <Link href="/register" onClick={scrollToTop}>
                          Register
                        </Link>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="loginRegsDiv">
                    <ul>
                      <li>
                        <a href="#" onClick={onLogout}>
                          Logout
                        </a>
                      </li>
                    </ul>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>
    </Scope>
  );
}
