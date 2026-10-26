'use client';


import Link from 'next/link';
import { useEffect, useState } from 'react';
import { nameOrEmail, usePanel } from '@/components/panel/PanelProvider';
import { Crumb, Messages, PanelPage, useFlash } from '@/components/panel/ui';
import { useLineChart } from '@/components/panel/useChart';
import { panelApi } from '@/lib/panelApi';
import { diffForHumans } from '@/lib/carbon';

const fmt = (n) => new Intl.NumberFormat('en-US').format(Number(n ?? 0));

function CountWidget({ color, icon, count, label }) {
  return (
    <div className="card widget">
      <div className="card-body">
        <div className="row">
          <div className={`p-3 ${color} flex-1`}>
            <i className={`fa ${icon} fa-3x`}></i>
          </div>
          <div className="pr-3">
            <h2 className="text-right">{fmt(count)}</h2>
            <div className="text-muted">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserActions() {
  const card = (href, icon, label) => (
    <div className="col-md-3">
      <div className="card">
        <div className="card-body">
          <Link href={href} className="text-center no-decoration">
            <div className="icon my-3">
              <i className={`${icon} fa-2x`}></i>
            </div>
            <p className="lead mb-0">{label}</p>
          </Link>
        </div>
      </div>
    </div>
  );
  return (
    <>
      {card('/panel/profile', 'fas fa-user', 'Update Profile')}
      {card('/panel/profile/sessions', 'fa fa-list', 'My Sessions')}
      {card('/panel/profile/activity', 'fas fa-server', 'Activity Log')}
      {card('/panel/logout', 'fas fa-sign-out-alt', 'Logout')}
    </>
  );
}

function RegistrationHistory({ perMonth }) {
  const [canvas, setCanvas] = useState(null);
  useLineChart(canvas, perMonth ? Object.keys(perMonth) : null, perMonth ? Object.values(perMonth) : null, 'Registration History', (v) => `new ${v == 1 ? 'user' : 'users'}`);
  return (
    <div className="card">
      <h6 className="card-header">Registration History</h6>
      <div className="card-body">
        <div className="pt-4 px-3">
          <canvas ref={setCanvas} id="myChart" height="365"></canvas>
        </div>
      </div>
    </div>
  );
}

function ActivityWidget({ activities }) {
  const [canvas, setCanvas] = useState(null);
  useLineChart(canvas, activities ? Object.keys(activities) : null, activities ? Object.values(activities) : null, 'Registration History', (v) => (v == 1 ? 'action' : 'actions'));
  return (
    <div className="card">
      <h6 className="card-header">Activity (Last Two Weeks)</h6>
      <div className="card-body">
        <div className="pt-4 px-3">
          <canvas ref={setCanvas} id="myChart" height="400"></canvas>
        </div>
      </div>
    </div>
  );
}

function LatestRegistrations({ users }) {
  return (
    <div className="card overflow-hidden">
      <h6 className="card-header d-flex align-items-center justify-content-between">
        Latest Registrations
        {users.length > 0 && (
          <small className="float-right">
            <Link href="/panel/users">View All</Link>
          </small>
        )}
      </h6>
      <div className="card-body p-0">
        {users.length > 0 ? (
          <ul className="list-group list-group-flush">
            {users.map((u) => (
              <li key={u.id} className="list-group-item list-group-item-action px-4 py-3">
                <Link href={`/panel/users/${u.id}`} className="d-flex text-dark no-decoration">
                  <img className="rounded-circle" width="40" height="40" src={u.avatar} />
                  <div className="ml-2" style={{ lineHeight: 1.2 }}>
                    <span className="d-block p-0">{nameOrEmail(u)}</span>
                    <small className="text-muted">{diffForHumans(u.created_at)}</small>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No records found.</p>
        )}
      </div>
    </div>
  );
}

export default function PanelDashboardPage() {
  const panel = usePanel();
  const flash = useFlash();
  const admin = panel.can('users.manage');
  const isUser = panel.hasRole('User');
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState(null);

  useEffect(() => {
    if (admin) panelApi.get('/stats').then((r) => r.ok && setStats(r.data));
    if (isUser) panelApi.get('/stats/activity').then((r) => r.ok && setActivities(r.data));
  }, [admin, isUser]);

  const s = stats?.users_per_status ?? {};
  return (
    <PanelPage title="Dashboard" heading="Dashboard" breadcrumbs={<Crumb active>Dashboard</Crumb>}>
      <Messages success={flash} />
      <div className="row">
        {isUser && <UserActions />}
        {admin && (
          <>
            <div className="col-md-3">
              <CountWidget color="text-primary" icon="fa-users" count={s.total} label="Total Users" />
            </div>
            <div className="col-md-3">
              <CountWidget color="text-success" icon="fa-user-plus" count={s.new} label="New Users" />
            </div>
            <div className="col-md-3">
              <CountWidget color="text-danger" icon="fa-user-slash" count={s.banned} label="Banned Users" />
            </div>
            <div className="col-md-3">
              <CountWidget color="text-info" icon="fa-user" count={s.unconfirmed} label="Unconfirmed Users" />
            </div>
            <div className="col-md-8">
              <RegistrationHistory perMonth={stats?.users_per_month} />
            </div>
            <div className="col-md-4">
              {/* LatestRegistrations widget: users->latest(6) (the API's stats carry 7) */}
              <LatestRegistrations users={(stats?.latest_registrations ?? []).slice(0, 6)} />
            </div>
          </>
        )}
        {isUser && (
          <div className="col-md-12">
            <ActivityWidget activities={activities} />
          </div>
        )}
      </div>
    </PanelPage>
  );
}
