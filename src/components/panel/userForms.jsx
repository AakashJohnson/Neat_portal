'use client';
// user/partials/{details,auth,avatar}.blade.php and assets/js/as/profile.js.
import { useEffect, useRef, useState } from 'react';
import Datepicker from '@/components/panel/Datepicker';
import { nameOrEmail } from '@/components/panel/PanelProvider';
import { bsModal } from '@/components/bootstrap/bsModal';
import { DATE_FORMAT, formatDate } from '@/lib/carbon';

const STATUSES = ['Active', 'Banned', 'Unconfirmed'];

/** user/partials/details: role, status, names, birthday, phone, address, country. */
export function DetailsFields({ v, user, edit, profile, roles, countries }) {
  return (
    <div className="row">
      <div className="col-md-6">
        <div className={v.groupClass('role_id')}>
          <label htmlFor="first_name">Role</label>
          <select className="form-control input-solid" id="role_id" name="role_id" defaultValue={edit ? String(user.role_id) : ''} disabled={profile}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name}
              </option>
            ))}
          </select>
          {v.error('role_id')}
        </div>
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select className="form-control input-solid" id="status" name="status" defaultValue={edit ? user.status : ''} disabled={profile}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="first_name">First Name</label>
          <input type="text" className="form-control input-solid" id="first_name" name="first_name" placeholder="First Name" defaultValue={edit ? user.first_name ?? '' : ''} />
        </div>
        <div className="form-group">
          <label htmlFor="last_name">Last Name</label>
          <input type="text" className="form-control input-solid" id="last_name" name="last_name" placeholder="Last Name" defaultValue={edit ? user.last_name ?? '' : ''} />
        </div>
      </div>
      <div className="col-md-6">
        <div className="form-group">
          <label htmlFor="birthday">Date of Birth</label>
          <div className={v.groupClass('birthday')}>
            <Datepicker name="birthday" id="birthday" defaultValue={edit && user.birthday ? formatDate(user.birthday, DATE_FORMAT) : ''} className="form-control input-solid" />
            {v.error('birthday')}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input type="text" className="form-control input-solid" id="phone" name="phone" placeholder="Phone" defaultValue={edit ? user.phone ?? '' : ''} />
        </div>
        <div className="form-group">
          <label htmlFor="address">Address</label>
          <input type="text" className="form-control input-solid" id="address" name="address" placeholder="Address" defaultValue={edit ? user.address ?? '' : ''} />
        </div>
        <div className="form-group">
          <label htmlFor="address">Country</label>
          <select name="country_id" className="form-control input-solid" defaultValue={edit ? String(user.country_id ?? '') : ''}>
            <option value="0">Select a Country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {edit && (
        <div className="col-md-12 mt-2">
          <button type="submit" className="btn btn-primary" id="update-details-btn">
            <i className="fa fa-refresh"></i> Update Details
          </button>
        </div>
      )}
    </div>
  );
}

/** user/partials/auth: e-mail, username, password (+ confirmation). */
export function AuthFields({ v, user, edit }) {
  const blank = "Leave field blank if you don't want to change it";
  const field = (name, type, placeholder, label, defaultValue) => (
    <div className={v.groupClass(name)}>
      <label htmlFor={name}>{label}</label>
      <input type={type} className="form-control input-solid" id={name} name={name} placeholder={placeholder} defaultValue={defaultValue} {...v.field(name)} />
      {v.error(name)}
    </div>
  );
  return (
    <>
      {field('email', 'email', 'Email', 'Email', edit ? user.email : '')}
      {field('username', 'text', '(optional)', 'Username', edit ? user.username ?? '' : '')}
      {field('password', 'password', edit ? blank : undefined, edit ? 'New Password' : 'Password')}
      {field('password_confirmation', 'password', edit ? blank : undefined, edit ? 'Confirm New Password' : 'Confirm Password')}
      {edit && (
        <button type="submit" className="btn btn-primary mt-2" id="update-login-details-btn">
          <i className="fa fa-refresh"></i> Update Details
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------- avatar

let croppieLoading = null;
function loadCroppie() {
  if (window.Croppie) return Promise.resolve(window.Croppie);
  croppieLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/panel/assets/plugins/croppie/croppie.js';
    s.onload = () => resolve(window.Croppie);
    s.onerror = reject;
    document.body.appendChild(s);
  });
  return croppieLoading;
}

/**
 * user/partials/avatar + profile.js: "Change Photo" opens the source modal
 * (No Photo / Upload / Gravatar); an upload is cropped with Croppie (circle
 * viewport) and saved with its crop points.
 * @param {{ user, edit: boolean, onUpload(file, points), onExternal(url|null), saving: boolean }} props
 */
export function AvatarCard({ user, edit, gravatar, onUpload, onExternal }) {
  const wrapper = useRef(null);
  const croppieEl = useRef(null);
  const modal = useRef(null);
  const croppie = useRef(null);
  const file = useRef(null);
  const [cropping, setCropping] = useState(false);
  const [spinner, setSpinner] = useState(false);
  const [saving, setSaving] = useState(false);

  const initCroppie = async (image) => {
    const Croppie = await loadCroppie();
    const width = wrapper.current.clientWidth;
    const bWidth = (width * 82) / 100;
    const vWidth = Math.min((bWidth * 53) / 100, 160);
    croppie.current?.destroy();
    croppie.current = new Croppie(croppieEl.current, { viewport: { width: vWidth, height: vWidth, type: 'circle' }, boundary: { width: bWidth, height: 202 } });
    if (image) await croppie.current.bind({ url: image });
  };

  useEffect(() => () => croppie.current?.destroy(), []);

  const readFile = (input) => {
    if (!input.files?.[0]) return;
    file.current = input.files[0];
    bsModal(modal.current)?.hide();
    setCropping(true);
    setSpinner(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      await initCroppie(e.target.result);
      setSpinner(false);
    };
    reader.readAsDataURL(input.files[0]);
  };

  const cancel = () => {
    croppie.current?.destroy();
    croppie.current = null;
    setCropping(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const points = croppie.current?.get().points ?? [];
    await onUpload(file.current, { x1: points[0], y1: points[1], x2: points[2], y2: points[3] });
    setSaving(false);
  };

  return (
    <>
      <div className="avatar-wrapper" ref={wrapper}>
        <div className="spinner" style={{ opacity: spinner ? 1 : undefined }}>
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
        </div>
        <div id="avatar" ref={croppieEl}></div>
        <div className="text-center">
          <div className="avatar-preview" style={cropping ? { display: 'none', visibility: 'hidden' } : undefined}>
            <img className="avatar rounded-circle img-thumbnail img-responsive mt-5 mb-4" width="150" src={edit ? user.avatar : '/panel/assets/img/profile.png'} />
            <h5 className="text-muted">{nameOrEmail(user)}</h5>
          </div>
          <div id="change-picture" className="btn btn-outline-secondary btn-block mt-5" data-toggle="modal" data-target="#choose-modal" style={cropping ? { display: 'none' } : undefined} onClick={() => bsModal(modal.current)?.show()}>
            <i className="fa fa-camera"></i> Change Photo
          </div>
          <div className={`row avatar-controls ${cropping ? 'd-flex' : 'd-none'}`}>
            <div className="col-md-6">
              <div id="cancel-upload" className="btn btn-block btn-outline-secondary text-center" onClick={cancel}>
                <i className="fa fa-times"></i> Cancel
              </div>
            </div>
            <div className="col-md-6">
              <button type="submit" id="save-photo" className={`btn btn-success btn-block text-center${saving ? ' disabled' : ''}`} disabled={saving} onClick={save}>
                {saving ? (
                  <>
                    <i className="fa fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fa fa-check"></i> Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal fade" id="choose-modal" ref={modal}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-body">
              <div className="row">
                <div className="col-md-4 avatar-source" id="no-photo">
                  <img src="/panel/assets/img/profile.png" className="rounded-circle img-thumbnail img-responsive" onClick={() => onExternal(null)} />
                  <p className="mt-3">No Photo</p>
                </div>
                <div className="col-md-4 avatar-source">
                  <div className="btn btn-light btn-upload">
                    <i className="fa fa-upload"></i>
                    <input type="file" name="avatar" id="avatar-upload" onChange={(e) => readFile(e.currentTarget)} />
                  </div>
                  <p className="mt-3">Upload Photo</p>
                </div>
                {edit && (
                  <div className="col-md-4 avatar-source source-external">
                    <img src={gravatar} className="rounded-circle img-thumbnail img-responsive" onClick={() => onExternal(gravatar)} />
                    <p className="mt-3">Gravatar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** User::gravatar(): https://www.gravatar.com/avatar/<md5(lower(trim(email)))>?size=150 */
export async function gravatarUrl(email) {
  const { default: md5 } = await import('@/lib/md5');
  return `https://www.gravatar.com/avatar/${md5(String(email ?? '').trim().toLowerCase())}?size=150`;
}
