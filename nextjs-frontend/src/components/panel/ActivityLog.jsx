'use client';
// user-activity::index — the activity log of all users (adminView), of one
// user (adminView + user) or of the logged-in user: search on the message,
// 20 per page, user agent in a focus popover.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Pagination from '@/components/panel/Pagination';
import { nameOrEmail, usePanel } from '@/components/panel/PanelProvider';
import { Crumb, PanelPage, Popover, Tooltip } from '@/components/panel/ui';
import { panelApi } from '@/lib/panelApi';
import { DATE_TIME_FORMAT, formatDate } from '@/lib/carbon';

/** @param {{ mode: 'all' | 'user' | 'own', userId?: string }} props */
export default function ActivityLog({ mode, userId }) {
  const router = useRouter();
  const params = useSearchParams();
  const panel = usePanel();
  const search = params.get('search') ?? '';
  const page = params.get('page') ?? '1';
  const [result, setResult] = useState(null);
  const adminView = mode !== 'own';
  const base = mode === 'all' ? '/panel/activity' : mode === 'user' ? `/panel/activity/user/${userId}/log` : '/panel/profile/activity';

  useEffect(() => {
    const path = mode === 'all' ? '/panel/activity' : mode === 'user' ? `/panel/activity/user/${userId}` : '/panel/profile/activity';
    panelApi.get(path, { search, page }).then((r) => r.ok && setResult(r.data));
  }, [mode, userId, search, page]);

  const userName = mode === 'user' ? result?.user?.name_or_email ?? '' : mode === 'own' ? nameOrEmail(panel.user) : null;
  const activities = result?.data ?? [];

  return (
    <PanelPage
      title="Activity Log"
      heading={userName ?? 'Activity Log'}
      breadcrumbs={
        mode === 'user' ? (
          <>
            <Crumb href="/panel/activity">Activity Log</Crumb>
            <Crumb active>{userName}</Crumb>
          </>
        ) : (
          <Crumb active>Activity Log</Crumb>
        )
      }
    >
      <div className="card">
        <div className="card-body">
          <form
            action=""
            method="GET"
            id="users-form"
            className="border-bottom-light mb-3"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`${base}?search=${encodeURIComponent(new FormData(e.currentTarget).get('search') ?? '')}`);
            }}
          >
            <div className="row justify-content-between mt-3 mb-4">
              <div className="col-lg-5 col-md-6">
                <div className="input-group custom-search-form">
                  <input type="text" className="form-control input-solid" name="search" defaultValue={search} key={search} placeholder="Search for Action" />
                  <span className="input-group-append">
                    {search !== '' && (
                      <Link href={adminView ? '/panel/activity' : '/panel/profile/activity'} className="btn btn-light d-flex align-items-center" role="button">
                        <i className="fas fa-times text-muted"></i>
                      </Link>
                    )}
                    <button className="btn btn-light" type="submit" id="search-activities-btn">
                      <i className="fas fa-search text-muted"></i>
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </form>
          <div className="table-responsive">
            <table className="table table-borderless table-striped">
              <thead>
                <tr>
                  {adminView && <th className="min-width-150">User</th>}
                  <th>IP Address</th>
                  <th className="min-width-200">Message</th>
                  <th className="min-width-200">Log Time</th>
                  <th className="text-center">More Info</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id}>
                    {adminView && (
                      <td>
                        {mode === 'user' ? (
                          a.user_name
                        ) : (
                          <Tooltip title="View Activity Log">
                            <Link href={`/panel/activity/user/${a.user_id}/log`} data-toggle="tooltip">
                              {a.user_name}
                            </Link>
                          </Tooltip>
                        )}
                      </td>
                    )}
                    <td>{a.ip_address}</td>
                    <td>{a.description}</td>
                    <td>{formatDate(a.created_at, DATE_TIME_FORMAT)}</td>
                    <td className="text-center">
                      <Popover title="User Agent" content={a.user_agent} placement="left">
                        <a tabIndex="0" role="button" className="btn btn-icon" data-trigger="focus" data-placement="left" data-toggle="popover" data-content={a.user_agent}>
                          <i className="fas fa-info-circle"></i>
                        </a>
                      </Popover>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Pagination meta={result?.meta} />
    </PanelPage>
  );
}
