'use client';


import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { impersonate } from '@/components/panel/actions';
import { DeleteLink } from '@/components/panel/confirm';
import Pagination from '@/components/panel/Pagination';
import { presentName, usePanel } from '@/components/panel/PanelProvider';
import { Crumb, Messages, PanelPage, Tooltip, setFlash, useDropdown, useFlash } from '@/components/panel/ui';
import { panelApi, validationMessages } from '@/lib/panelApi';
import { DATE_FORMAT, formatDate } from '@/lib/carbon';
import { searchResponse, updateSearchParams, useAsyncSearch } from '@/lib/liveSearch';
import SearchStatus from '@/components/common/SearchStatus';

const LABEL_CLASS = { Active: 'success', Banned: 'danger' };

function Row({ user, onDeleted }) {
  const panel = usePanel();
  const router = useRouter();
  const { setRoot, show, toggleProps } = useDropdown();
  const canImpersonate = panel.user && Number(panel.user.id) !== Number(user.id);
  return (
    <tr>
      <td style={{ width: '40px' }}>
        <Link href={`/panel/users/${user.id}`}>
          <img className="rounded-circle img-responsive" width="40" src={user.avatar} alt={presentName(user)} />
        </Link>
      </td>
      <td className="align-middle">
        <Link href={`/panel/users/${user.id}`}>{user.username || 'N/A'}</Link>
      </td>
      <td className="align-middle">{`${user.first_name ?? ''} ${user.last_name ?? ''}`}</td>
      <td className="align-middle">{user.email}</td>
      <td className="align-middle">{formatDate(user.created_at, DATE_FORMAT)}</td>
      <td className="align-middle">
        <span className={`badge badge-lg badge-${LABEL_CLASS[user.status] ?? 'warning'}`}>{user.status}</span>
      </td>
      <td className="text-center align-middle">
        <div ref={setRoot} className={`dropdown show d-inline-block`}>
          <a className="btn btn-icon" href="#" role="button" id="dropdownMenuLink" {...toggleProps}>
            <i className="fas fa-ellipsis-h"></i>
          </a>
          <div className={`dropdown-menu dropdown-menu-right${show}`} aria-labelledby="dropdownMenuLink">
            <Link href={`/panel/users/${user.id}/sessions`} className="dropdown-item text-gray-500">
              <i className="fas fa-list mr-2"></i>
              User Sessions
            </Link>
            <Link href={`/panel/users/${user.id}`} className="dropdown-item text-gray-500">
              <i className="fas fa-eye mr-2"></i>
              View User
            </Link>
            {canImpersonate && (
              <a
                href={`/panel/impersonate/take/${user.id}`}
                className="dropdown-item text-gray-500 impersonate"
                onClick={(e) => {
                  e.preventDefault();
                  impersonate(panel, router, user.id);
                }}
              >
                <i className="fas fa-user-secret mr-2"></i>
                Impersonate
              </a>
            )}
          </div>
        </div>
        <Tooltip title="Edit User">
          <Link href={`/panel/users/${user.id}/edit`} className="btn btn-icon edit" data-toggle="tooltip" data-placement="top">
            <i className="fas fa-edit"></i>
          </Link>
        </Tooltip>
        <Tooltip title="Delete User">
          <DeleteLink
            href={`/panel/users/${user.id}`}
            data-toggle="tooltip"
            data-placement="top"
            confirmTitle="Please Confirm"
            confirmText="Are you sure that you want to delete this user?"
            confirmButton="Yes, delete him!"
            onConfirm={async () => onDeleted(await panelApi.delete(`/users/${user.id}`))}
          >
            <i className="fas fa-trash"></i>
          </DeleteLink>
        </Tooltip>
      </td>
    </tr>
  );
}

export default function PanelUsersPage() {
  const params = useSearchParams();
  const flash = useFlash();
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const page = params.get('page') ?? '1';
  const [messages, setMessages] = useState({ errors: [], success: flash });

  const load = useCallback(async () => {
    const result = searchResponse(await panelApi.get('/users', { search, status, page, per_page: 20 }));
    if (!Array.isArray(result?.data)) throw new Error('Unable to load users. Please try again.');
    return result;
  }, [search, status, page]);
  const query = useAsyncSearch(load);
  const result = query.data;

  const onDeleted = (res) => {
    if (res.ok) {
      setFlash('User deleted successfully.');
      setMessages({ errors: [], success: 'User deleted successfully.' });
      query.refresh();
    } else setMessages({ errors: res.data?.error ? [res.data.error] : validationMessages(res.data), success: null });
  };

  const users = result?.data ?? [];
  return (
    <PanelPage title="Users" heading="Users" breadcrumbs={<Crumb active>Users</Crumb>}>
      <Messages errors={messages.errors} success={messages.success} />
      <div className="card">
        <div className="card-body">
          <form
            action=""
            method="GET"
            id="users-form"
            className="pb-2 mb-3 border-bottom-light"
            onSubmit={(e) => {
              e.preventDefault();
              query.refresh();
            }}
          >
            <div className="row my-3 flex-md-row flex-column-reverse">
              <div className="col-md-4 mt-md-0 mt-2">
                <div className="input-group custom-search-form">
                  <input type="search" aria-label="Search for users" className="form-control input-solid" name="search" value={search} onChange={e => updateSearchParams('/panel/users', { search: e.target.value })} placeholder="Search for users..." />
                  <span className="input-group-append">
                    {search !== '' && (
                      <button type="button" onClick={() => updateSearchParams('/panel/users', { search: '' })} aria-label="Clear user search" className="btn btn-light d-flex align-items-center text-muted">
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                    <button className="btn btn-light" type="submit" id="search-users-btn" aria-label="Search users">
                      <i className="fas fa-search text-muted"></i>
                    </button>
                  </span>
                </div>
              </div>
              <div className="col-md-2 mt-2 mt-md-0">
                <select id="status" aria-label="User status" className="form-control input-solid" name="status" value={status} onChange={(e) => updateSearchParams('/panel/users', { status: e.target.value })}>
                  <option value="">All</option>
                  <option value="Active">Active</option>
                  <option value="Banned">Banned</option>
                  <option value="Unconfirmed">Unconfirmed</option>
                </select>
              </div>
              <div className="col-md-6">
                <Link href="/panel/users/create" className="btn btn-primary btn-rounded float-right">
                  <i className="fas fa-plus mr-2"></i>
                  Add User
                </Link>
              </div>
            </div>
          </form>
          <SearchStatus loading={query.loading} error={query.error} />
          <div className="table-responsive" id="users-table-wrapper" aria-busy={query.loading}>
            <table className="table table-borderless table-striped">
              <thead>
                <tr>
                  <th></th>
                  <th className="min-width-80">Username</th>
                  <th className="min-width-150">Full Name</th>
                  <th className="min-width-100">Email</th>
                  <th className="min-width-80">Registration Date</th>
                  <th className="min-width-80">Status</th>
                  <th className="text-center min-width-150">Action</th>
                </tr>
              </thead>
              <tbody>
                {result && users.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <em>No records found.</em>
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <Row key={u.id} user={u} onDeleted={onDeleted} />
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
