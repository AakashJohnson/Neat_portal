'use client';
// announcements::index (announcements.manage, 10 per page): creator avatar /
// username (linked for users.manage), title (Str::limit 50), created date,
// edit and delete.
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DeleteLink } from '@/components/panel/confirm';
import Pagination from '@/components/panel/Pagination';
import { usePanel } from '@/components/panel/PanelProvider';
import { Crumb, Messages, PanelPage, Tooltip, useFlash } from '@/components/panel/ui';
import { panelApi, validationMessages } from '@/lib/panelApi';
import { DATE_FORMAT, formatDate } from '@/lib/carbon';

/** Str::limit($value, 50): first 50 characters + "...". */
const limit = (value, n = 50) => {
  const chars = Array.from(value ?? '');
  return chars.length <= n ? chars.join('') : `${chars.slice(0, n).join('').trimEnd()}...`;
};

export default function PanelAnnouncementsPage() {
  const panel = usePanel();
  const flash = useFlash();
  const page = useSearchParams().get('page') ?? '1';
  const [result, setResult] = useState(null);
  const [messages, setMessages] = useState({ errors: [], success: flash, n: 0 });

  const load = useCallback(() => panelApi.get('/panel/announcements', { page }).then((r) => r.ok && setResult(r.data)), [page]);
  useEffect(() => {
    panelApi.get('/panel/announcements', { page }).then((r) => r.ok && setResult(r.data));
  }, [page]);

  const remove = async (a) => {
    const res = await panelApi.delete(`/panel/announcements/${a.id}`);
    setMessages((m) => (res.ok ? { errors: [], success: 'Announcement deleted successfully.', n: m.n + 1 } : { errors: validationMessages(res.data), success: null, n: m.n + 1 }));
    load();
  };

  const announcements = result?.data ?? [];
  return (
    <PanelPage title="Announcements" heading="Announcements" breadcrumbs={<Crumb active>Announcements</Crumb>}>
      <Messages key={messages.n} errors={messages.errors} success={messages.success} />
      <div className="d-flex mb-4">
        <Link href="/panel/announcements/create" className="btn btn-primary btn-rounded ml-auto">
          <i className="fas fa-plus mr-2"></i>
          Create Announcement
        </Link>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-borderless table-striped">
              <thead>
                <tr>
                  <th></th>
                  <th className="min-width-150">Creator</th>
                  <th className="min-width-150">Title</th>
                  <th className="min-width-150">Created At</th>
                  <th className="text-center min-width-150">Action</th>
                </tr>
              </thead>
              <tbody>
                {result && announcements.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <em>No announcements found.</em>
                    </td>
                  </tr>
                )}
                {announcements.map((a) => (
                  <tr key={a.id}>
                    <td style={{ width: '40px' }}>
                      <Link href={`/panel/users/${a.creator?.id ?? a.user_id}`}>
                        <img className="rounded-circle img-responsive" width="40" src={a.creator?.avatar} alt={a.creator?.name} />
                      </Link>
                    </td>
                    <td className="align-middle">
                      {panel.can('users.manage') ? (
                        <Link href={`/panel/users/${a.creator?.id ?? a.user_id}`}>{a.creator?.username || 'N/A'}</Link>
                      ) : (
                        <span>{a.creator?.username || 'N/A'}</span>
                      )}
                    </td>
                    <td className="align-middle">
                      <Link href={`/panel/announcements/${a.id}`}>{limit(a.title)}</Link>
                    </td>
                    <td className="align-middle">{formatDate(a.created_at, DATE_FORMAT)}</td>
                    <td className="text-center align-middle">
                      <Tooltip title="Edit Announcement">
                        <Link href={`/panel/announcements/${a.id}/edit`} className="btn btn-icon edit" data-toggle="tooltip" data-placement="top">
                          <i className="fas fa-edit"></i>
                        </Link>
                      </Tooltip>
                      <Tooltip title="Delete Announcement">
                        <DeleteLink
                          href={`/panel/announcements/${a.id}`}
                          data-toggle="tooltip"
                          data-placement="top"
                          confirmTitle="Please Confirm"
                          confirmText="Are you sure that you want to delete this announcement?"
                          confirmButton="Yes, delete it!"
                          onConfirm={() => remove(a)}
                        >
                          <i className="fas fa-trash"></i>
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
      <Pagination meta={result?.meta} />
    </PanelPage>
  );
}
