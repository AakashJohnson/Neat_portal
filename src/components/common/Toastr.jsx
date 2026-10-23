'use client';
// Port of ngx-toastr 11 as configured in app.module.ts (timeOut 3000,
// positionClass toast-bottom-right, preventDuplicates false) with its library
// defaults: newestOnTop, tapToDismiss, extendedTimeOut 1000 (after hover),
// 300 ms ease-in opacity fade, no close button, no progress bar.
// The DOM matches the library's so legacy.css (ngx-toastr/toastr.css) styles it:
//   .cdk-overlay-container > #toast-container.toast-bottom-right.toast-container
//     > .toast-success.ngx-toastr > .toast-title + .toast-message
// Usage (same call shape as ToastrService): toastr.success(message, title?)
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const CONFIG = { timeOut: 3000, extendedTimeOut: 1000, easeTime: 300, positionClass: 'toast-bottom-right' };

let nextId = 1;
let toasts = [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const removeToast = (id) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

function show(type, message, title) {
  // newestOnTop: true
  toasts = [{ id: nextId++, type, message: message == null ? '' : String(message), title }, ...toasts];
  emit();
}

export const toastr = {
  success: (message, title) => show('toast-success', message, title),
  error: (message, title) => show('toast-error', message, title),
  info: (message, title) => show('toast-info', message, title),
  warning: (message, title) => show('toast-warning', message, title),
};

function Toast({ toast }) {
  const [state, setState] = useState('inactive'); // inactive → active → removed
  const timer = useRef(null);

  const remove = () => {
    clearTimeout(timer.current);
    setState((s) => {
      if (s === 'removed') return s;
      timer.current = setTimeout(() => removeToast(toast.id), CONFIG.easeTime);
      return 'removed';
    });
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => setState('active'));
    timer.current = setTimeout(remove, CONFIG.timeOut);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per toast, like activateToast()
  }, []);

  return (
    <div
      className={`${toast.type} ngx-toastr`}
      style={{ opacity: state === 'active' ? 1 : 0, transition: `opacity ${CONFIG.easeTime}ms ease-in` }}
      onClick={remove} // tapToDismiss
      onMouseEnter={() => state !== 'removed' && clearTimeout(timer.current)} // stickAround
      onMouseLeave={() => {
        if (state === 'removed') return;
        timer.current = setTimeout(remove, CONFIG.extendedTimeOut); // delayedHideToast
      }}
    >
      {toast.title && (
        <div className="toast-title" aria-label={toast.title}>
          {toast.title}
        </div>
      )}
      {toast.message && (
        <div role="alertdialog" aria-live="polite" className="toast-message" aria-label={toast.message}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const list = useSyncExternalStore(subscribe, () => toasts, () => toasts);
  if (!list.length) return null;
  return (
    <div className="cdk-overlay-container">
      <div id="toast-container" className={`${CONFIG.positionClass} toast-container`}>
        {list.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}
