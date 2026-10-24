'use client';
// Port of components/admin/admin.component (the admin shell): dashboard navbar,
// side navbar with routerLinkActive entries and the page footer around the
// routed child. The role check (role_id 1, else logout) is enforced by
// proxy.js. #toggle-btn has no handler: the theme's custom-js.js binds it in
// $(document).ready, before the router renders this shell.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/components/providers/SessionProvider';

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

  const logout = async () => {
    await removeToken();
    router.push('/login');
  };

  return (
    <div className="page">
      <header className="header">
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
                <a id="toggle-btn" className="menu-btn active">
                  <span></span>
                  <span></span>
                  <span></span>
                </a>
              </div>
              <ul className="nav-menu list-unstyled d-flex flex-md-row align-items-md-center">
                <li className="nav-item">
                  <a className="org-button mt-2" style={{ color: 'white' }} onClick={logout}>
                    {' '}
                    <span className="d-none d-sm-inline">Logout</span>
                    <i className="fa fa-sign-out"></i>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>
      <div className="page-content d-flex align-items-stretch">
        <nav className="side-navbar">
          <div className="sidebar-header d-flex align-items-center">
            <div className="avatar">
              <img src="http://neatapi.aicte-india.org/assets/img/icons/company_logo/00000000001.png" alt="..." className="img-fluid rounded-circle" />
            </div>
            <div className="title">
              <h1 className="h4">NEAT ADMIN</h1>
              <p>User Name</p>
            </div>
          </div>
          <ul className="list-unstyled">
            {MENU.map(([href, icon, label]) => (
              <li key={href} tabIndex="0" className={isActive(pathname, href) ? 'active' : undefined} onClick={() => router.push(href)}>
                <Link href={href}>
                  {' '}
                  <i className={`zmdi ${icon}`}></i>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="content-inner">
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
