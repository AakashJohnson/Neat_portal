'use client';


import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DeleteLink } from '@/components/panel/confirm';
import { Crumb, Messages, PanelPage, Tooltip, useFlash } from '@/components/panel/ui';
import { panelApi, validationMessages } from '@/lib/panelApi';

export default function PanelRolesPage() {
  const flash = useFlash();
  const [roles, setRoles] = useState(null);
  const [messages, setMessages] = useState({ errors: [], success: flash, n: 0 });
  const load = useCallback(() => panelApi.get('/roles').then((r) => r.ok && setRoles(r.data)), []);
  useEffect(() => {
    panelApi.get('/roles').then((r) => r.ok && setRoles(r.data));
  }, []);

  const remove = async (role) => {
    const res = await panelApi.delete(`/roles/${role.id}`);
    setMessages((m) => (res.ok ? { errors: [], success: 'Role deleted successfully.', n: m.n + 1 } : { errors: validationMessages(res.data), success: null, n: m.n + 1 }));
    load();
  };

  return (
    <PanelPage title="Roles" heading="Roles" breadcrumbs={<Crumb active>Roles</Crumb>}>
      <Messages key={messages.n} errors={messages.errors} success={messages.success} />
      <div className="card">
        <div className="card-body">
          <div className="row mb-3 pb-3 border-bottom-light">
            <div className="col-lg-12">
              <div className="float-right">
                <Link href="/panel/roles/create" className="btn btn-primary btn-rounded">
                  <i className="fas fa-plus mr-2"></i>
                  Add Role
                </Link>
              </div>
            </div>
          </div>
          <div className="table-responsive" id="users-table-wrapper">
            <table className="table table-striped table-borderless">
              <thead>
                <tr>
                  <th className="min-width-100">Name</th>
                  <th className="min-width-150">Display Name</th>
                  <th className="min-width-150"># of users with this role</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {roles && roles.length === 0 && (
                  <tr>
                    <td colSpan="4">
                      <em>No records found.</em>
                    </td>
                  </tr>
                )}
                {(roles ?? []).map((role) => (
                  <tr key={role.id}>
                    <td>{role.name}</td>
                    <td>{role.display_name}</td>
                    <td>{role.users_count}</td>
                    <td className="text-center">
                      <Tooltip title="Edit Role">
                        <Link href={`/panel/roles/${role.id}/edit`} className="btn btn-icon" data-toggle="tooltip" data-placement="top">
                          <i className="fas fa-edit"></i>
                        </Link>
                      </Tooltip>
                      {role.removable && (
                        <Tooltip title="Delete Role">
                          <DeleteLink
                            href={`/panel/roles/${role.id}`}
                            data-toggle="tooltip"
                            data-placement="top"
                            confirmTitle="Please Confirm"
                            confirmText="Are you sure that you want to delete this role?"
                            confirmButton="Yes, delete it!"
                            onConfirm={() => remove(role)}
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
    </PanelPage>
  );
}
