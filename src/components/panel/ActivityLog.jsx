'use client';
// user-activity::index — the activity log of all users (adminView), of one
// user (adminView + user) or of the logged-in user: search on the message,
// 20 per page, user agent in a focus popover.
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import Pagination from '@/components/panel/Pagination';
import { nameOrEmail, usePanel } from '@/components/panel/PanelProvider';
import { Crumb, PanelPage, Popover, Tooltip } from '@/components/panel/ui';
import { panelApi } from '@/lib/panelApi';
import { DATE_TIME_FORMAT, formatDate } from '@/lib/carbon';
import { searchResponse, updateSearchParams, useAsyncSearch } from '@/lib/liveSearch';
import SearchStatus from '@/components/common/SearchStatus';

/** @param {{ mode: 'all' | 'user' | 'own', userId?: string }} props */
export default function ActivityLog({ mode, userId }) {
  const params = useSearchParams();
  const panel = usePanel();
  const search = params.get('search') ?? '';
  const page = params.get('page') ?? '1';
  const adminView = mode !== 'own';
  const base = mode === 'all' ? '/panel/activity' : mode === 'user' ? `/panel/activity/user/${userId}/log` : '/panel/profile/activity';

  const load = useCallback(async () => {
    const path = mode === 'all' ? '/panel/activity' : mode === 'user' ? `/panel/activity/user/${userId}` : '/panel/profile/activity';
    const data = searchResponse(await panelApi.get(path, { search, page }));
    if (!Array.isArray(data?.data)) throw new Error('Unable to load activities. Please try again.');
    return data;
  }, [mode, userId, search, page]);
  const query = useAsyncSearch(load);
  const result = query.data;

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
              query.refresh();
            }}
          >
            <div className="row justify-content-between mt-3 mb-4">
              <div className="col-lg-5 col-md-6">
                <div className="input-group custom-search-form">
                  <input type="search" aria-label="Search for Action" className="form-control input-solid" name="search" value={search} onChange={e => updateSearchParams(base, { search: e.target.value })} placeholder="Search for Action" />
                  <span className="input-group-append">
                    {search !== '' && (
                      <button type="button" onClick={() => updateSearchParams(base, { search: '' })} aria-label="Clear activity search" className="btn btn-light d-flex align-items-center">
                        <i className="fas fa-times text-muted"></i>
                      </button>
                    )}
                    <button className="btn btn-light" type="submit" id="search-activities-btn" aria-label="Search activities">
                      <i className="fas fa-search text-muted"></i>
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </form>
          <SearchStatus loading={query.loading} error={query.error} empty={activities.length === 0} />
          <div className="table-responsive" aria-busy={query.loading}>
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
