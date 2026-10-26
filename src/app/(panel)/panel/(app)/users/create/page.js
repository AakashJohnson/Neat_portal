'use client';


import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthFields, DetailsFields } from '@/components/panel/userForms';
import { Crumb, Messages, PanelPage, setFlash } from '@/components/panel/ui';
import { useJsValidation } from '@/lib/jsValidation';
import { panelApi, validationMessages } from '@/lib/panelApi';

export default function PanelUserCreatePage() {
  const router = useRouter();
  const v = useJsValidation({ email: 'required|email', username: 'nullable', password: 'required|min:6|confirmed', birthday: 'nullable|date', role_id: 'required', verified: 'boolean' });
  const [roles, setRoles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    panelApi.get('/roles').then((r) => r.ok && setRoles(r.data));
    panelApi.get('/countries').then((r) => r.ok && setCountries(r.data));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!v.validateAll(e.currentTarget)) return;
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!Number(data.country_id)) delete data.country_id;
    if (!data.username) data.username = null;
    const res = await panelApi.post('/users', { ...data, verified: '1' });
    if (res.ok) {
      setFlash('User created successfully.');
      router.push('/panel/users');
    } else setErrors(validationMessages(res.data));
  };

  return (
    <PanelPage
      title="Add User"
      heading="Create New User"
      breadcrumbs={
        <>
          <Crumb href="/panel/users">Users</Crumb>
          <Crumb active>Create</Crumb>
        </>
      }
    >
      <Messages errors={errors} />
      <form method="POST" action="/panel/users" encType="multipart/form-data" id="user-form" noValidate onSubmit={onSubmit}>
        <div className="card">
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <h5 className="card-title">User Details</h5>
                <p className="text-muted font-weight-light">A general user profile information.</p>
              </div>
              <div className="col-md-9">{roles.length > 0 && <DetailsFields v={v} edit={false} profile={false} roles={roles} countries={countries} />}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <h5 className="card-title">Login Details</h5>
                <p className="text-muted font-weight-light">Details used for authenticating with the application.</p>
              </div>
              <div className="col-md-9">
                <AuthFields v={v} edit={false} />
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12">
            <button type="submit" className="btn btn-primary">
              Create User
            </button>
          </div>
        </div>
      </form>
      <br />
    </PanelPage>
  );
}
