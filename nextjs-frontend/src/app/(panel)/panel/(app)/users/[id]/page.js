'use client';
// user/view.blade.php: avatar, name, e-mail, phone, birthday, full address,
// last login; Impersonate | Edit links; plus user-activity::recent-activity,
// which the activity-log plugin's ShowUserComposer adds (10 latest entries).
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { impersonate } from '@/components/panel/actions';
import { nameOrEmail, presentName, usePanel } from '@/components/panel/PanelProvider';
import { Crumb, PanelPage, Tooltip } from '@/components/panel/ui';
import { panelApi } from '@/lib/panelApi';
import { DATE_FORMAT, DATE_TIME_FORMAT, diffForHumans, formatDate } from '@/lib/carbon';

export default function PanelUserViewPage() {
  const { id } = useParams();
  const panel = usePanel();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [countries, setCountries] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    panelApi.get(`/users/${id}`).then((r) => r.ok && setUser(r.data));
    panelApi.get('/countries').then((r) => r.ok && setCountries(r.data));
    panelApi.get(`/panel/users/${id}/latest-activity`).then((r) => r.ok && setActivities(r.data));
  }, [id]);

  if (!user) return null;
  const name = nameOrEmail(user);
  // UserPresenter::fullAddress()
  const country = countries.find((c) => Number(c.id) === Number(user.country_id))?.name;
  const fullAddress = (user.address ?? '') + (user.country_id ? (user.address ? `, ${country ?? ''}` : country ?? '') : '') || 'N/A';
  const canImpersonate = panel.user && Number(panel.user.id) !== Number(user.id);

  return (
    <PanelPage
      title={name}
      heading={name}
      breadcrumbs={
        <>
          <Crumb href="/panel/users">Users</Crumb>
          <Crumb active>{name}</Crumb>
        </>
      }
    >
      <div className="row">
        <div className="col-lg-5 col-xl-4">
          <div className="card">
            <h6 className="card-header d-flex align-items-center justify-content-between">
              Details
              <small>
                {canImpersonate && (
                  <>
                    <Tooltip title="Impersonate User">
                      <a
                        href={`/panel/impersonate/take/${user.id}`}
                        data-toggle="tooltip"
                        data-placement="top"
                        onClick={(e) => {
                          e.preventDefault();
                          impersonate(panel, router, user.id);
                        }}
                      >
                        Impersonate
                      </a>
                    </Tooltip>{' '}
                    <span className="text-muted">|</span>{' '}
                  </>
                )}
                <Tooltip title="Edit User">
                  <Link href={`/panel/users/${user.id}/edit`} className="edit" data-toggle="tooltip" data-placement="top">
                    Edit
                  </Link>
                </Tooltip>
              </small>
            </h6>
            <div className="card-body">
              <div className="d-flex align-items-center flex-column pt-3">
                <div>
                  <img className="rounded-circle img-thumbnail img-responsive mb-4" width="130" height="130" src={user.avatar} />
                </div>
                {/* @if ($name = present()->name): "%s %s" is never empty, so the heading always shows. */}
                <h5>{presentName(user)}</h5>
                <a href={`mailto:${user.email}`} className="text-muted font-weight-light mb-2">
                  {user.email}
                </a>
              </div>
              <ul className="list-group list-group-flush mt-3">
                {user.phone && (
                  <li className="list-group-item">
                    <strong>Phone:</strong> <a href={`telto:${user.phone}`}>{user.phone}</a>
                  </li>
                )}
                <li className="list-group-item">
                  <strong>Birthday:</strong> {user.birthday ? formatDate(user.birthday, DATE_FORMAT) : 'N/A'}
                </li>
                <li className="list-group-item">
                  <strong>Address:</strong> {fullAddress}
                </li>
                <li className="list-group-item">
                  <strong>Last Logged In:</strong> {user.last_login ? diffForHumans(user.last_login) : 'N/A'}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-7 col-xl-8">
          <div className="card">
            <h6 className="card-header d-flex align-items-center justify-content-between">
              Latest Activity
              {activities.length > 0 && (
                <small>
                  <Tooltip title="Complete Activity Log">
                    <Link href={`/panel/activity/user/${user.id}/log`} className="edit" data-toggle="tooltip" data-placement="top">
                      View All
                    </Link>
                  </Tooltip>
                </small>
              )}
            </h6>
            <div className="card-body">
              {activities.length > 0 ? (
                <table className="table table-borderless table-striped">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a) => (
                      <tr key={a.id}>
                        <td>{a.description}</td>
                        <td>{formatDate(a.created_at, DATE_TIME_FORMAT)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted font-weight-light">
                  <em>No activity from this user yet.</em>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PanelPage>
  );
}
