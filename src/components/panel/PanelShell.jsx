'use client';
// layouts/app.blade.php: partials/navbar (page heading, breadcrumbs,
// impersonation, the announcements hook, user dropdown), partials/sidebar
// (user box, plugin items filtered by permission, active by Request::is()),
// and assets/js/as/app.js (sidebar toggle, body.sidebar-collapsed between 992
// and 1199 px).
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBsCollapse } from '@/components/bootstrap/useBsCollapse';
import { PanelProvider, nameOrEmail, presentName, usePanel } from '@/components/panel/PanelProvider';
import { PageMetaContext, useDropdown } from '@/components/panel/ui';
import { panelApi } from '@/lib/panelApi';
import { diffForHumans } from '@/lib/carbon';

/** Request::is($pattern) on the Laravel path (pathname without /panel, no leading slash, "/" for the root). */
export function requestIs(pathname, patterns) {
  const path = pathname.replace(/^\/panel/, '').replace(/^\/+/, '') || '/';
  return [patterns].flat().some((p) => {
    const pattern = p === '/' ? '/' : String(p).replace(/^\/+/, '');
    const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    return re.test(path);
  });
}

// Neat::availablePlugins() sidebar items, in plugin order.
const SIDEBAR = [
  { title: 'Dashboard', href: '/panel', icon: 'fas fa-home', active: '/' },
  { title: 'Users', href: '/panel/users', icon: 'fas fa-users', active: 'users*', permissions: ['users.manage'] },
  { title: 'Activity Log', href: '/panel/activity', icon: 'fas fa-server', active: 'activity*', permissions: ['users.activity'] },
  {
    title: 'Roles & Permissions',
    href: '#roles-dropdown',
    icon: 'fas fa-users-cog',
    permissions: ['roles.manage', 'permissions.manage'],
    children: [
      { title: 'Roles', href: '/panel/roles', active: 'roles*', permissions: ['roles.manage'] },
      { title: 'Permissions', href: '/panel/permissions', active: 'permissions*', permissions: ['permissions.manage'] },
    ],
  },
  {
    title: 'Settings',
    href: '#settings-dropdown',
    icon: 'fas fa-cogs',
    permissions: ['settings.general', 'settings.auth', 'settings.notifications'],
    children: [
      { title: 'General', href: '/panel/settings', active: 'settings', permissions: ['settings.general'] },
      { title: 'Auth & Registration', href: '/panel/settings/auth', active: 'settings/auth', permissions: ['settings.auth'] },
      { title: 'Notifications', href: '/panel/settings/notifications', active: 'settings/notifications', permissions: ['settings.notifications'] },
    ],
  },
  { title: 'Announcements', href: '/panel/announcements', icon: 'fas fa-bullhorn', active: 'announcements*', permissions: ['announcements.manage'] },
];

function DropdownItem({ item, pathname, can }) {
  const expanded = requestIs(pathname, item.children.map((c) => c.active));
  const { target, trigger, toggle } = useBsCollapse();
  return (
    <li className="nav-item">
      <a ref={trigger} className="nav-link " href={item.href} data-toggle="collapse" aria-expanded={expanded ? 'true' : 'false'} onClick={toggle}>
        <i className={item.icon}></i>
        <span>{item.title}</span>
      </a>
      <ul ref={target} className={`${expanded ? '' : 'collapse'} list-unstyled sub-menu`} id={item.href.replace('#', '')}>
        {item.children.map((child) => (
          <SidebarItem key={child.title} item={child} pathname={pathname} can={can} />
        ))}
      </ul>
    </li>
  );
}

function SidebarItem({ item, pathname, can }) {
  if (item.permissions && !can(item.permissions)) return null;
  if (item.children) return <DropdownItem item={item} pathname={pathname} can={can} />;
  return (
    <li className="nav-item">
      <Link className={`nav-link ${requestIs(pathname, item.active) ? 'active' : ''}`} href={item.href}>
        {item.icon && <i className={item.icon}></i>}
        <span>{item.title}</span>
      </Link>
    </li>
  );
}

/** announcements::partials.navbar.list (NavbarItemsHook). */
function AnnouncementsNavbar({ announcements }) {
  const { setRoot: ddRoot, show: ddShow, toggleProps: ddToggle } = useDropdown();
  const [unread, setUnread] = useState(announcements.unread);
  const items = announcements.items;
  return (
    <li
      ref={ddRoot}
      className={`nav-item dropdown announcements d-flex align-items-center px-3${ddShow}`}
      id="announcements-icon"
      onClick={() => {
        // announcements.js: $.post("/announcements/read") and the badge is removed.
        panelApi.post('/announcements/read');
        setUnread(false);
      }}
    >
      <a href="#" className="text-gray-500 position-relative nav-icon" id="announcementsDropdown" role="button" {...ddToggle}>
        {unread && <i className="activity-badge"></i>}
        <i className="fas fa-bullhorn"></i>
      </a>
      <div
        className={`dropdown-menu dropdown-menu-right position-absolute p-0 shadow-lg${ddShow}`}
        aria-labelledby="announcementsDropdown"
        style={{ width: '380px', height: '350px', overflowY: 'scroll', overflowX: 'hidden' }}
      >
        <div className="text-center p-4">
          <h5 className="text-muted mt-2">Announcements</h5>
          {items.length > 0 && <Link href="/panel/announcements/list">View All</Link>}
        </div>
        <div className="bg-lighter">
          {items.length > 0 ? (
            items.map((a) => (
              <div key={a.id} className="d-flex align-items-start px-4 p-4 navbar-item">
                <img src={a.creator?.avatar} width="50" height="50" className="rounded-circle img-responsive mr-3" />
                <div className="w-100">
                  <div className="d-flex justify-content-between align-items-start">
                    <span className="font-weight-bold">{a.creator?.name}</span>
                    <span className="text-muted">{diffForHumans(a.created_at, { absolute: true, short: true })}</span>
                  </div>
                  <Link href={`/panel/announcements/${a.id}`}>{a.title}</Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center">No new announcements at the moment.</p>
          )}
        </div>
      </div>
    </li>
  );
}

function Navbar({ meta }) {
  const panel = usePanel();
  const router = useRouter();
  const { setRoot: ddRoot, show: ddShow, toggleProps: ddToggle } = useDropdown();
  const [topOpen, setTopOpen] = useState(false);
  const leave = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/panel/impersonate', { method: 'DELETE' });
    if (res.ok) {
      await panel.refresh();
      router.push('/panel/users');
    }
  };
  return (
    <nav className="navbar fixed-top align-items-start navbar-expand-lg pl-0 pr-0 py-0">
      <div className="navbar-brand-wrapper d-flex align-items-center justify-content-center">
        <Link className="navbar-brand mr-0" href="/panel">
          <img src="/panel/assets/img/neat-logo.png" className="logo-lg" height="35" alt={panel.settings.app_name} />
          <img src="/panel/assets/img/neat-logo-no-text.png" className="logo-sm" height="35" alt={panel.settings.app_name} />
        </Link>
      </div>
      <div>
        {panel.impersonating && (
          <Link href="/panel/impersonate/leave" className="navbar-toggler text-danger hidden-md" onClick={leave}>
            <i className="fas fa-user-secret"></i>
          </Link>
        )}
        <button className="navbar-toggler" type="button" id="sidebar-toggle" onClick={() => document.querySelector('.sidebar')?.classList.toggle('expanded')}>
          <i className="fas fa-align-right text-muted"></i>
        </button>
        <button
          className="navbar-toggler mr-3"
          type="button"
          data-toggle="collapse"
          data-target="#top-navigation"
          aria-controls="top-navigation"
          aria-expanded={String(topOpen)}
          aria-label="Toggle navigation"
          onClick={() => setTopOpen((o) => !o)}
        >
          <i className="fas fa-bars text-muted"></i>
        </button>
      </div>
      <div className={`collapse navbar-collapse${topOpen ? ' show' : ''}`} id="top-navigation">
        <div className="row ml-2">
          <div className="col-lg-12 d-flex align-items-left align-items-md-center flex-column flex-md-row py-3">
            <h4 className="page-header mb-0">{meta.heading}</h4>
            <ol className="breadcrumb mb-0 font-weight-light">
              <li className="breadcrumb-item">
                <Link href="/panel" className="text-muted">
                  <i className="fa fa-home"></i>
                </Link>
              </li>
              {meta.breadcrumbs}
            </ol>
          </div>
        </div>
        <ul className="navbar-nav ml-auto pr-3 flex-row">
          {panel.impersonating && (
            <li className="nav-item d-flex align-items-center visible-lg">
              <Link href="/panel/impersonate/leave" className="btn text-danger" onClick={leave}>
                <i className="fas fa-user-secret mr-2"></i>
                Stop Impersonating
              </Link>
            </li>
          )}
          <AnnouncementsNavbar announcements={panel.announcements} />
          <li ref={ddRoot} className={`nav-item dropdown${ddShow}`}>
            <a className="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" {...ddToggle}>
              <img src={panel.user?.avatar} width="50" height="50" className="rounded-circle img-thumbnail img-responsive" />
            </a>
            <div className={`dropdown-menu dropdown-menu-right position-absolute p-0${ddShow}`} aria-labelledby="navbarDropdown">
              <Link className="dropdown-item py-2" href="/panel/profile">
                <i className="fas fa-user text-muted mr-2"></i>
                My Profile
              </Link>
              <Link href="/panel/profile/sessions" className="dropdown-item py-2">
                <i className="fas fa-list text-muted mr-2"></i>
                Active Sessions
              </Link>
              <div className="dropdown-divider m-0"></div>
              <Link className="dropdown-item py-2" href="/panel/logout">
                <i className="fas fa-sign-out-alt text-muted mr-2"></i>
                Logout
              </Link>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function Sidebar() {
  const panel = usePanel();
  const pathname = usePathname();
  return (
    <nav className="col-md-2 sidebar">
      <div className="user-box text-center pt-5 pb-3">
        <div className="user-img">
          <img src={panel.user?.avatar} width="90" height="90" alt="user-img" className="rounded-circle img-thumbnail img-responsive" />
        </div>
        <h5 className="my-3">
          <Link href="/panel/profile">{nameOrEmail(panel.user)}</Link>
        </h5>
        <ul className="list-inline mb-2">
          <li className="list-inline-item">
            <Link href="/panel/profile" title="My Profile">
              <i className="fas fa-cog"></i>
            </Link>
          </li>
          <li className="list-inline-item">
            <Link href="/panel/logout" className="text-custom" title="Logout">
              <i className="fas fa-sign-out-alt"></i>
            </Link>
          </li>
        </ul>
      </div>
      <div className="sidebar-sticky">
        <ul className="nav flex-column">
          {SIDEBAR.map((item) => (
            <SidebarItem key={item.title} item={item} pathname={pathname} can={panel.can} />
          ))}
        </ul>
      </div>
    </nav>
  );
}

/** Redirects of the `auth` / `verified` middleware, then the layout. */
function Guarded({ children }) {
  const panel = usePanel();
  const router = useRouter();
  const pathname = usePathname();
  const [meta, setMetaState] = useState({ heading: null, breadcrumbs: null });
  const setMeta = useCallback((m) => setMetaState(m), []);
  const metaValue = useMemo(() => ({ setMeta, appName: panel.settings.app_name }), [setMeta, panel.settings.app_name]);

  useEffect(() => {
    if (panel.loading) return;
    if (!panel.user) router.replace(`/panel/login`);
    else if (!panel.user.email_verified_at && pathname !== '/panel/email/verify' && !pathname.startsWith('/panel/email/verify/')) router.replace('/panel/email/verify');
  }, [panel.loading, panel.user, pathname, router]);

  // as.updateSidebarSize()
  useEffect(() => {
    const update = () => document.body.classList.toggle('sidebar-collapsed', window.innerWidth >= 992 && window.innerWidth <= 1199);
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      document.body.classList.remove('sidebar-collapsed');
    };
  }, []);

  if (panel.loading || !panel.user) return null;
  return (
    <PageMetaContext.Provider value={metaValue}>
      <Navbar meta={meta} />
      <div className="container-fluid">
        <div className="row">
          <Sidebar />
          <div className="content-page">
            <main role="main" className="px-4">
              {children}
            </main>
          </div>
        </div>
      </div>
    </PageMetaContext.Provider>
  );
}

export default function PanelShell({ children }) {
  return (
    <PanelProvider>
      <Guarded>{children}</Guarded>
    </PanelProvider>
  );
}

export { presentName };
