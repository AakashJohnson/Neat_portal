'use client';
// user/edit.blade.php (admin, Users\*Controller) and user/profile.blade.php
// (own profile, Profile\*Controller): "User Details" / "Login Details" tabs
// (2FA tab only with setting 2fa.enabled — off), avatar card on the side.
// Each form saves and reloads with the controller's success message.
import { useCallback, useEffect, useState } from 'react';
import { AuthFields, AvatarCard, DetailsFields, gravatarUrl } from '@/components/panel/userForms';
import { Messages, useFlash } from '@/components/panel/ui';
import { usePanel } from '@/components/panel/PanelProvider';
import { useJsValidation } from '@/lib/jsValidation';
import { panelApi, validationMessages } from '@/lib/panelApi';

const DETAILS = ['role_id', 'status', 'first_name', 'last_name', 'birthday', 'phone', 'address', 'country_id'];

export default function UserEditor({ userId = null, onLoaded }) {
  const profile = userId === null;
  const panel = usePanel();
  const flash = useFlash();
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [gravatar, setGravatar] = useState('');
  const [tab, setTab] = useState('details');
  const [messages, setMessages] = useState({ errors: [], success: flash, n: 0 });
  const details = useJsValidation({ birthday: 'nullable|date', role_id: 'required' });
  const login = useJsValidation({ email: 'required|email', username: 'nullable', password: `nullable|min:${profile ? 8 : 8}|confirmed` });

  const apply = useCallback(
    async (res) => {
      if (!res.ok) return;
      setUser(res.data);
      onLoaded?.(res.data);
      setGravatar(await gravatarUrl(res.data.email));
    },
    // onLoaded is a page callback for the heading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const path = profile ? '/me' : `/users/${userId}`;
  const load = useCallback(() => panelApi.get(path).then(apply), [path, apply]);

  useEffect(() => {
    panelApi.get(path).then(apply);
    panelApi.get('/roles').then((r) => r.ok && setRoles(r.data));
    panelApi.get('/countries').then((r) => r.ok && setCountries(r.data));
  }, [path, apply]);

  const done = async (res, success) => {
    if (res.ok) {
      setMessages((m) => ({ errors: [], success, n: m.n + 1 }));
      await load();
      if (profile) panel.refresh();
    } else setMessages((m) => ({ errors: res.data?.error ? [res.data.error] : validationMessages(res.data), success: null, n: m.n + 1 }));
    window.scrollTo(0, 0);
  };

  const saveDetails = async (e) => {
    e.preventDefault();
    if (!details.validateAll(e.currentTarget)) return;
    const all = Object.fromEntries(new FormData(e.currentTarget).entries());
    const data = Object.fromEntries(DETAILS.filter((k) => k in all).map((k) => [k, all[k]]));
    if (!Number(data.country_id)) data.country_id = null;
    const res = profile ? await panelApi.patch('/me/details', data) : await panelApi.put(`/users/${userId}`, data);
    done(res, profile ? 'Profile updated successfully.' : 'User updated successfully.');
  };

  const saveLogin = async (e) => {
    e.preventDefault();
    if (!login.validateAll(e.currentTarget)) return;
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!data.password) {
      delete data.password;
      delete data.password_confirmation;
    }
    const res = profile ? await panelApi.patch('/me/details/auth', data) : await panelApi.put(`/users/${userId}`, data);
    done(res, 'Login details updated successfully.');
  };

  const base = profile ? '/me/avatar' : `/users/${userId}/avatar`;
  const onUpload = async (file, points) => {
    const fd = new FormData();
    fd.append('file', file);
    for (const [k, val] of Object.entries(points)) fd.append(`points[${k}]`, String(val));
    const res = await fetch(`/bff${base}?token=`, { method: 'PUT', body: fd, headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => ({}));
    done({ ok: res.ok, data: body }, 'Avatar changed successfully.');
  };
  const onExternal = async (url) => done(url ? await panelApi.put(`${base}/external`, { url }) : await panelApi.delete(base), 'Avatar changed successfully.');

  if (!user || roles.length === 0) return null;
  const tabLink = (id, label) => (
    <li className="nav-item">
      <a
        className={`nav-link${tab === id ? ' active' : ''}`}
        id={id === 'details' ? 'details-tab' : 'authentication-tab'}
        data-toggle="tab"
        href={`#${id === 'details' ? 'details' : 'login-details'}`}
        role="tab"
        aria-controls="home"
        aria-selected={tab === id ? 'true' : 'false'}
        onClick={(e) => {
          e.preventDefault();
          setTab(id);
        }}
      >
        {label}
      </a>
    </li>
  );

  return (
    <>
      <Messages key={messages.n} errors={messages.errors} success={messages.success} />
      <div className="row">
        <div className={profile ? 'col-md-8' : 'col-8'}>
          <div className="card">
            <div className="card-body">
              <ul className="nav nav-tabs" id="nav-tab" role="tablist">
                {tabLink('details', 'User Details')}
                {tabLink('login', 'Login Details')}
              </ul>
              <div className="tab-content mt-4" id="nav-tabContent">
                <div className={`tab-pane fade px-2${tab === 'details' ? ' show active' : ''}`} id="details" role="tabpanel" aria-labelledby="nav-home-tab">
                  <form action="" method="POST" id="details-form" noValidate onSubmit={saveDetails}>
                    <DetailsFields v={details} user={user} edit profile={profile} roles={roles} countries={countries} />
                  </form>
                </div>
                <div className={`tab-pane fade px-2${tab === 'login' ? ' show active' : ''}`} id="login-details" role="tabpanel" aria-labelledby="nav-profile-tab">
                  <form action="" method="POST" id="login-details-form" noValidate onSubmit={saveLogin}>
                    <AuthFields v={login} user={user} edit />
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={profile ? 'col-md-4' : 'col-4'}>
          <div className="card">
            <div className="card-body">
              <form action="" method="POST" id="avatar-form" encType="multipart/form-data" onSubmit={(e) => e.preventDefault()}>
                <AvatarCard user={user} edit gravatar={gravatar} onUpload={onUpload} onExternal={onExternal} />
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
