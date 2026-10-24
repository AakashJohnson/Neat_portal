'use client';
// permission/index.blade.php (permissions.manage): the permissions × roles
// checkbox matrix ("Save Permissions" syncs every role), edit / delete per
// permission (delete only when removable).
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DeleteLink } from '@/components/panel/confirm';
import { Crumb, Messages, PanelPage, Tooltip, useFlash } from '@/components/panel/ui';
import { panelApi, validationMessages } from '@/lib/panelApi';

export default function PanelPermissionsPage() {
  const flash = useFlash();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [granted, setGranted] = useState({}); // role id → Set(permission name)
  const [messages, setMessages] = useState({ errors: [], success: flash, n: 0 });
  const [version, setVersion] = useState(0);

  const fetchAll = useCallback(async () => {
    const [r, p] = await Promise.all([panelApi.get('/roles'), panelApi.get('/permissions')]);
    const roleList = r.ok ? r.data : [];
    const perRole = await Promise.all(roleList.map((role) => panelApi.get(`/roles/${role.id}/permissions`)));
    return {
      roles: roleList,
      permissions: p.ok ? p.data : [],
      granted: Object.fromEntries(roleList.map((role, i) => [role.id, new Set((perRole[i].ok ? perRole[i].data : []).map((x) => x.name))])),
    };
  }, []);
  const apply = (d) => {
    setRoles(d.roles);
    setPermissions(d.permissions);
    setGranted(d.granted);
    setVersion((n) => n + 1);
  };
  useEffect(() => {
    fetchAll().then(apply);
  }, [fetchAll]);

  const done = (res, success) => setMessages((m) => (res.ok ? { errors: [], success, n: m.n + 1 } : { errors: validationMessages(res.data), success: null, n: m.n + 1 }));

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { roles: {} };
    for (const [key, value] of fd.entries()) {
      const m = /^roles\[(\d+)\]\[\]$/.exec(key);
      if (m) (body.roles[m[1]] ??= []).push(value);
    }
    done(await panelApi.post('/panel/permissions/save', body), 'Permissions saved successfully.');
    apply(await fetchAll());
  };

  const remove = async (permission) => {
    done(await panelApi.delete(`/permissions/${permission.id}`), 'Permission deleted successfully.');
    apply(await fetchAll());
  };

  return (
    <PanelPage title="Permissions" heading="Permissions" breadcrumbs={<Crumb active>Permissions</Crumb>}>
      <Messages key={messages.n} errors={messages.errors} success={messages.success} />
      <form method="POST" action="/panel/permissions/save" className="mb-4" onSubmit={save} key={version}>
        <div className="card">
          <div className="card-body">
            <div className="row mb-3 pb-3 border-bottom-light">
              <div className="col-lg-12">
                <div className="float-right">
                  <Link href="/panel/permissions/create" className="btn btn-primary btn-rounded">
                    <i className="fas fa-plus mr-2"></i>
                    Add Permission
                  </Link>
                </div>
              </div>
            </div>
            <div className="table-responsive" id="users-table-wrapper">
              <table className="table table-striped table-borderless">
                <thead>
                  <tr>
                    <th className="min-width-200">Name</th>
                    {roles.map((role) => (
                      <th key={role.id} className="text-center">
                        {role.display_name}
                      </th>
                    ))}
                    <th className="text-center min-width-100">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions && permissions.length === 0 && (
                    <tr>
                      <td colSpan="4">
                        <em>No records found.</em>
                      </td>
                    </tr>
                  )}
                  {(permissions ?? []).map((permission) => (
                    <tr key={permission.id}>
                      <td>{permission.display_name || permission.name}</td>
                      {roles.map((role) => (
                        <td key={role.id} className="text-center">
                          <div className="custom-control custom-checkbox">
                            <input
                              className="custom-control-input"
                              id={`cb-${role.id}-${permission.id}`}
                              name={`roles[${role.id}][]`}
                              type="checkbox"
                              value={permission.id}
                              defaultChecked={granted[role.id]?.has(permission.name)}
                            />
                            <label className="custom-control-label d-inline" htmlFor={`cb-${role.id}-${permission.id}`}></label>
                          </div>
                        </td>
                      ))}
                      <td className="text-center">
                        <Tooltip title="Edit Permission">
                          <Link href={`/panel/permissions/${permission.id}/edit`} className="btn btn-icon" data-toggle="tooltip" data-placement="top">
                            <i className="fas fa-edit"></i>
                          </Link>
                        </Tooltip>
                        {permission.removable && (
                          <Tooltip title="Delete Permission">
                            <DeleteLink
                              href={`/panel/permissions/${permission.id}`}
                              data-toggle="tooltip"
                              data-placement="top"
                              confirmTitle="Please Confirm"
                              confirmText="Are you sure that you want to delete this permission?"
                              confirmButton="Yes, delete it!"
                              onConfirm={() => remove(permission)}
                            >
                              <i className="fas fa-trash"></i>
                            </DeleteLink>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {permissions && permissions.length > 0 && (
          <div className="row">
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary">
                Save Permissions
              </button>
            </div>
          </div>
        )}
      </form>
    </PanelPage>
  );
}
