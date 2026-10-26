'use client';


import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Crumb, Messages, PanelPage, setFlash } from '@/components/panel/ui';
import { useJsValidation } from '@/lib/jsValidation';
import { panelApi, validationMessages } from '@/lib/panelApi';

const KIND = {
  role: { api: '/roles', list: '/panel/roles', crumb: 'Roles', title: 'Roles', create: 'Create New Role', details: 'Role Details', info: 'A general role information.', placeholder: 'Role Name', muted: 'text-muted', button: ['Create Role', 'Update Role'], done: ['Role created successfully.', 'Role updated successfully.'] },
  permission: { api: '/permissions', list: '/panel/permissions', crumb: 'Permissions', title: 'Permissions', create: 'Create New Permission', details: 'Permission Details', info: 'A general permission information.', placeholder: 'Permission Name', muted: 'text-muted font-weight-light', button: ['Create Permission', 'Update Permission'], done: ['Permission created successfully.', 'Permission updated successfully.'] },
};

export default function RolePermissionForm({ kind, id = null }) {
  const k = KIND[kind];
  const edit = id !== null;
  const router = useRouter();
  const v = useJsValidation({ name: 'required|regex:/^[a-zA-Z0-9\\-_\\.]+$/' });
  const [item, setItem] = useState(edit ? null : {});
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (edit) panelApi.get(`${k.api}/${id}`).then((r) => r.ok && setItem(r.data));
  }, [edit, id, k.api]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!v.validateAll(e.currentTarget)) return;
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = edit ? await panelApi.put(`${k.api}/${id}`, data) : await panelApi.post(k.api, data);
    if (res.ok) {
      setFlash(k.done[edit ? 1 : 0]);
      router.push(k.list);
    } else {
      setErrors(validationMessages(res.data));
      window.scrollTo(0, 0);
    }
  };

  if (!item) return null;
  const button = (
    <button type="submit" className="btn btn-primary">
      {k.button[edit ? 1 : 0]}
    </button>
  );
  return (
    <PanelPage
      title={k.title}
      heading={edit ? item.name : k.create}
      breadcrumbs={
        <>
          <Crumb href={k.list}>{k.crumb}</Crumb>
          <Crumb active>{edit ? 'Edit' : 'Create'}</Crumb>
        </>
      }
    >
      <Messages errors={errors} />
      <form method="POST" action={k.list} id={`${kind}-form`} noValidate onSubmit={onSubmit}>
        <div className="card">
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <h5 className="card-title">{k.details}</h5>
                <p className={k.muted}>{k.info}</p>
              </div>
              <div className="col-md-9">
                <div className={v.groupClass('name')}>
                  <label htmlFor="name">Name</label>
                  <input type="text" className="form-control input-solid" id="name" name="name" placeholder={k.placeholder} defaultValue={item.name ?? ''} {...v.field('name')} />
                  {v.error('name')}
                </div>
                <div className="form-group">
                  <label htmlFor="display_name">Display Name</label>
                  <input type="text" className="form-control input-solid" id="display_name" name="display_name" placeholder="Display Name" defaultValue={item.display_name ?? ''} />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea name="description" id="description" className="form-control input-solid" defaultValue={item.description ?? ''}></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
        {kind === 'role' ? (
          button
        ) : (
          <div className="row">
            <div className="col-md-2">{button}</div>
          </div>
        )}
      </form>
    </PanelPage>
  );
}
