'use client';
// user/sessions.blade.php: the database sessions of a user (or of the
// logged-in user) with "Invalidate Session".
import { useCallback, useEffect, useState } from 'react';
import { DeleteLink } from '@/components/panel/confirm';
import { Messages, Tooltip } from '@/components/panel/ui';
import { panelApi, validationMessages } from '@/lib/panelApi';
import { DATE_TIME_FORMAT, formatDate } from '@/lib/carbon';

export default function SessionsList({ userId = null }) {
  const [sessions, setSessions] = useState(null);
  const [messages, setMessages] = useState({ errors: [], success: null, n: 0 });
  const path = userId === null ? '/me/sessions' : `/users/${userId}/sessions`;

  const load = useCallback(() => panelApi.get(path).then((r) => r.ok && setSessions(r.data?.data ?? r.data)), [path]);
  useEffect(() => {
    panelApi.get(path).then((r) => r.ok && setSessions(r.data?.data ?? r.data));
  }, [path]);

  const invalidate = async (id) => {
    const res = await panelApi.delete(`/sessions/${id}`);
    setMessages((m) => (res.ok ? { errors: [], success: 'Session invalidated successfully.', n: m.n + 1 } : { errors: validationMessages(res.data), success: null, n: m.n + 1 }));
    load();
  };

  const list = sessions ?? [];
  return (
    <>
      <Messages key={messages.n} errors={messages.errors} success={messages.success} />
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-borderless table-striped">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Device</th>
                  <th>Browser</th>
                  <th>Last Activity</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions && list.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      <em>No records found.</em>
                    </td>
                  </tr>
                )}
                {list.map((s) => (
                  <tr key={s.id}>
                    <td>{s.ip_address}</td>
                    <td>
                      {s.device || 'Unknown'} ({s.platform || 'Unknown'})
                    </td>
                    <td>{s.browser || 'Unknown'}</td>
                    <td>{formatDate(s.last_activity, DATE_TIME_FORMAT)}</td>
                    <td className="text-center">
                      <Tooltip title="Invalidate Session">
                        <DeleteLink
                          href={userId === null ? `/panel/profile/sessions/${s.id}/invalidate` : `/panel/users/${userId}/sessions/${s.id}/invalidate`}
                          data-toggle="tooltip"
                          data-placement="top"
                          confirmTitle="Please Confirm"
                          confirmText="Are you sure that you want to invalidate this session?"
                          confirmButton="Yes, proceed!"
                          onConfirm={() => invalidate(s.id)}
                        >
                          <i className="fas fa-times"></i>
                        </DeleteLink>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
