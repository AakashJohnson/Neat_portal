'use client';
// Port of components/admin/admin.component (the admin shell): dashboard navbar,
// side navbar with routerLinkActive entries and the page footer around the
// routed child. The role check (role_id 1, else logout) is enforced by
// proxy.js. Menu state is owned by React on every viewport.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/components/providers/SessionProvider';
import { useEffect, useRef, useState } from 'react';
import styles from './AdminShell.module.css';

const MENU = [
  ['/admin/dashboard', 'zmdi-home', 'Home '],
  ['/admin/courses', 'zmdi-globe-alt', 'Products Offered '],
  ['/admin/registered-student', 'zmdi-male-female', 'Registered UG Student'],
  ['/admin/registered-institute', 'zmdi-receipt', 'Registered Institutes'],
  ['/admin/registered-company', 'zmdi-accounts', 'Registered Company'],
  ['/admin/registered-learner', 'zmdi-accounts', 'Registered Learner'],
  ['/admin/free-seat-allocation', 'zmdi-accounts', 'Free Allocation'],
  ['/admin/mou-management', 'zmdi-format-list-bulleted', 'MOU Management'],
  ['/admin/products-management', 'zmdi-calendar-account', 'Products Management'],
  ['/admin/free-seat-student', 'zmdi-accounts', 'Registerd Free Seat'],
  ['/admin/reports', 'zmdi-download', 'Reports'],
];

/** routerLinkActive (exact: false): the current URL starts with the link's segments. */
const isActive = (pathname, href) => pathname === href || pathname.startsWith(href + '/');

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { removeToken } = useSession();
  const [toggled, setToggled] = useState(false);
  const [wide, setWide] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(70);
  const header = useRef(null);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1200px)');
    const update = () => setWide(media.matches);
    update();
    media.addEventListener('change', update);
    const element = header.current;
    const observer = new ResizeObserver(() => setHeaderHeight(element.getBoundingClientRect().height));
    observer.observe(element);
    return () => { media.removeEventListener('change', update); observer.disconnect(); };
  }, []);

  const logout = async () => {
    await removeToken();
    router.push('/login');
  };

  return (
    <div className={`page ${styles.shell}`} style={{ '--admin-header-height': `${headerHeight}px` }}>
      <header className="header" ref={header}>
        <nav className="navbar dashboard">
          <div className="container-fluid">
            <div className="navbar-holder d-flex align-items-center justify-content-between">
              <div className="navbar-header">
                <Link href="/" className="navbar-brand d-none d-sm-inline-block">
                  <div className="brand-text d-none d-lg-inline-block">
                    <img src="/assets/img/logo.png" />
                  </div>
                  <div className="brand-text d-none d-sm-inline-block d-lg-none"></div>
                </Link>
                <button type="button" className={`menu-btn ${!toggled ? 'active' : ''} ${styles.toggle}`} aria-label="Toggle admin menu" aria-controls="admin-sidebar-menu" aria-expanded={wide ? !toggled : toggled} onClick={() => setToggled(value => !value)}>
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
              </div>
              <ul className={`nav-menu list-unstyled d-flex flex-md-row align-items-md-center ${styles.actions}`}>
                <li className="nav-item">
                  <Link href="/" className="org-button mt-2" style={{ color: 'white' }} aria-label="Home">
                    <i className="fa fa-home" aria-hidden="true"></i><span>Home</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <button type="button" className="org-button mt-2" style={{ color: 'white' }} onClick={logout} aria-label="Logout">
                    {' '}
                    <span className="d-none d-sm-inline">Logout</span>
                    <i className="fa fa-sign-out"></i>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>
      <div className="page-content d-flex align-items-stretch">
        <nav className={`side-navbar ${toggled ? 'shrinked' : ''} ${styles.sidebar}`} aria-label="Admin navigation">
          <div className="sidebar-header d-flex align-items-center">
            <div className="avatar">
              <img src="/assets/img/logo.png" alt="NEAT" className="img-fluid rounded-circle" />
            </div>
            <div className="title">
              <h1 className="h4">NEAT ADMIN</h1>
              <p>User Name</p>
            </div>
          </div>
          <ul id="admin-sidebar-menu" className={`list-unstyled ${styles.menu}`}>
            {MENU.map(([href, icon, label]) => (
              <li key={href} className={isActive(pathname, href) ? 'active' : undefined}>
                <Link href={href} aria-current={isActive(pathname, href) ? 'page' : undefined}>
                  {' '}
                  <i className={`zmdi ${icon}`}></i>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={`content-inner${toggled ? ' active' : ''}`}>
          {children}
          <footer className="main-footer">
            <div className="container-fluid">
              <div className="row">
                <div className="col-sm-12 text-center">
                  <p> Copyright © AICTE 2019.All right reserved. Created by AICTE</p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
