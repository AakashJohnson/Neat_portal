'use client';


import { useCallback, useEffect, useState } from 'react';
import { panelApi, validationMessages } from '@/lib/panelApi';

/** setting('a.b', fallback) on the loaded settings object. */
export function settingValue(settings, key, fallback = null) {
  let value = settings;
  for (const part of key.split('.')) {
    if (value === null || typeof value !== 'object' || !(part in value)) return fallback;
    value = value[part];
  }
  return value;
}

/** PHP truthiness ("0", "", null, false → false), as {{ setting(x) ? 'checked' : '' }}. */
export const phpTruthy = (v) => !(v === null || v === undefined || v === false || v === '' || v === '0' || v === 0);

export function useSettings(group) {
  const [state, setState] = useState(null);
  const [messages, setMessages] = useState({ errors: [], success: null, n: 0 });
  const fetchSettings = useCallback(() => panelApi.get(`/panel/settings/${group}`), [group]);

  useEffect(() => {
    fetchSettings().then((r) => r.ok && setState(r.data));
  }, [fetchSettings]);

  /** Posts `fields`; the last value of a repeated name wins (hidden 0 + checkbox 1), as in PHP. */
  const save = async (fields, success = 'Settings updated successfully.') => {
    const res = await panelApi.post(`/panel/settings/${group}`, fields);
    setMessages((m) => (res.ok ? { errors: [], success, n: m.n + 1 } : { errors: validationMessages(res.data), success: null, n: m.n + 1 }));
    const r = await fetchSettings();
    if (r.ok) setState(r.data);
    window.scrollTo(0, 0);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    save(Object.fromEntries(new FormData(e.currentTarget).entries()));
  };

  return { data: state, settings: state?.settings ?? {}, messages, save, onSubmit };
}

/** The hidden "0" + checkbox "1" switch with its label and help text. */
export function SettingSwitch({ name, id, checked, label, help, helpClass = 'pt-0 text-muted', className = 'form-group my-4' }) {
  return (
    <div className={className}>
      <div className="d-flex align-items-center">
        <div className="switch">
          <input type="hidden" value="0" name={name} />
          <input type="checkbox" name={name} className="switch" value="1" id={id} defaultChecked={checked} />
          <label htmlFor={id}></label>
        </div>
        <div className="ml-3 d-flex flex-column">
          <label className="mb-0">{label}</label>
          {help && <small className={helpClass}>{help}</small>}
        </div>
      </div>
    </div>
  );
}
