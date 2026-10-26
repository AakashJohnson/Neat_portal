'use client';
import { cloneElement, createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

// ---------------------------------------------------------------- page meta

export const PageMetaContext = createContext({ setMeta: () => {} });

/** Registers the page title / heading / breadcrumbs with the shell's navbar. */
export function PanelPage({ title, heading, breadcrumbs, children }) {
  const { setMeta, appName } = useContext(PageMetaContext);
  useEffect(() => {
    document.title = `${title} - ${appName ?? 'Neat'}`;
    setMeta({ heading, breadcrumbs });
    // heading/breadcrumbs are JSX: re-register when their text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, appName, typeof heading === 'string' ? heading : JSON.stringify(heading?.props ?? null), setMeta]);
  return children;
}

/** <li class="breadcrumb-item"><a href>…</a></li> / <li class="breadcrumb-item active">…</li> */
export const Crumb = ({ href, active, muted, children }) =>
  href ? (
    <li className="breadcrumb-item">
      <Link href={href}>{children}</Link>
    </li>
  ) : (
    <li className={`breadcrumb-item${active ? ' active' : ''}${muted ? ' text-muted' : ''}`}>{children}</li>
  );

// ------------------------------------------------------------------ messages

const FLASH_KEY = 'panel.flash';
/** redirect()->withSuccess(msg) */
export function setFlash(message) {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(message));
  } catch {
    // storage unavailable: the message is lost, as a lost session would lose it
  }
}
/** session('success'), read once. */
export function useFlash() {
  const [message] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const v = sessionStorage.getItem(FLASH_KEY);
      sessionStorage.removeItem(FLASH_KEY);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  });
  return message;
}

/** One .alert-notification: slideUp(600) 3.5 s after it is shown, then removed. */
function Notification({ className, children }) {
  const ref = useRef(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = setTimeout(() => {
      const h = el.offsetHeight;
      el.style.overflow = 'hidden';
      el.style.height = `${h}px`;
      const anim = el.animate(
        [
          { height: `${h}px`, paddingTop: getComputedStyle(el).paddingTop, paddingBottom: getComputedStyle(el).paddingBottom, marginBottom: getComputedStyle(el).marginBottom },
          { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginBottom: '0px' },
        ],
        { duration: 600, easing: 'ease' },
      );
      anim.onfinish = () => setGone(true);
    }, 3500);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div ref={ref} className={`alert ${className} alert-notification`}>
      {children}
    </div>
  );
}

/** @include('partials.messages'): validation errors, then the success flash. */
export function Messages({ errors = [], success }) {
  const list = Array.isArray(success) ? success : success ? [success] : [];
  return (
    <>
      {errors.length > 0 && (
        <Notification className="alert-danger" key={errors.join('|')}>
          <ul className="list-unstyled mb-0">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Notification>
      )}
      {list.map((msg, i) => (
        <Notification className="alert-success" key={`${i}${msg}`}>
          <i className="fa fa-check"></i> {msg}
        </Notification>
      ))}
    </>
  );
}

// ------------------------------------------------------------------ dropdown

/** Bootstrap 4 dropdown: .show on the .dropdown and its menu, closed on outside click / Esc. */
export function useDropdown() {
  const [el, setEl] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !el?.contains(e.target) || e.target.closest('.dropdown-item')) setOpen(false);
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, [open, el]);
  return {
    setRoot: setEl,
    open,
    toggleProps: {
      'data-toggle': 'dropdown',
      'aria-haspopup': 'true',
      'aria-expanded': String(open),
      onClick: (e) => {
        e.preventDefault();
        setOpen((o) => !o);
      },
    },
    show: open ? ' show' : '',
  };
}

// ------------------------------------------------------------------- tooltip

let tipId = 0;
const nextTipId = () => `tooltip${(tipId = (tipId + 1) % 1000000)}`;

/** Places a Bootstrap 4 tooltip/popover element relative to its trigger. */
function usePlacement(open, trigger, float, placement) {
  const [style, setStyle] = useState(null);
  useLayoutEffect(() => {
    if (!open || !trigger || !float) return;
    const t = trigger.getBoundingClientRect();
    const f = float.getBoundingClientRect();
    const sx = window.scrollX;
    const sy = window.scrollY;
    let x;
    let y;
    if (placement === 'left') {
      x = t.left - f.width;
      y = t.top + t.height / 2 - f.height / 2;
    } else if (placement === 'bottom') {
      x = t.left + t.width / 2 - f.width / 2;
      y = t.bottom;
    } else {
      x = t.left + t.width / 2 - f.width / 2;
      y = t.top - f.height;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- position measured from the laid-out trigger/tooltip
    setStyle({ position: 'absolute', transform: `translate3d(${Math.round(x + sx)}px, ${Math.round(y + sy)}px, 0px)`, top: '0px', left: '0px', willChange: 'transform' });
  }, [open, placement, trigger, float]);
  return style;
}

/** data-toggle="tooltip" title="…" data-placement="top": shown on hover/focus. */
export function Tooltip({ title, placement = 'top', children }) {
  const [trigger, setTrigger] = useState(null);
  const [tip, setTip] = useState(null);
  const [id, setId] = useState(null);
  const open = id !== null;
  const style = usePlacement(open, trigger, tip, placement);
  const show = () => setId(nextTipId());
  const hide = () => setId(null);
  const child = cloneElement(children, {
    ref: setTrigger,
    title: undefined,
    'data-original-title': title,
    'aria-describedby': id ?? undefined,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });
  return (
    <>
      {child}
      {open &&
        createPortal(
          <div ref={setTip} className={`tooltip fade bs-tooltip-${placement}${style ? ' show' : ''}`} role="tooltip" id={id} x-placement={placement} style={style ?? { position: 'absolute', visibility: 'hidden' }}>
            <div className="arrow" style={placement === 'left' ? { top: '50%', marginTop: '-0.4rem' } : { left: '50%', marginLeft: '-0.4rem' }}></div>
            <div className="tooltip-inner">{title}</div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** data-toggle="popover" data-trigger="focus": title + content beside the trigger while focused. */
export function Popover({ title, content, placement = 'left', children }) {
  const [trigger, setTrigger] = useState(null);
  const [pop, setPop] = useState(null);
  const uid = useId().replace(/[^a-z0-9]/gi, '');
  const [open, setOpen] = useState(false);
  const style = usePlacement(open, trigger, pop, placement);
  const child = cloneElement(children, {
    ref: setTrigger,
    title: undefined,
    'data-original-title': title,
    'aria-describedby': open ? `popover${uid}` : undefined,
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  });
  return (
    <>
      {child}
      {open &&
        createPortal(
          <div ref={setPop} className={`popover fade bs-popover-${placement}${style ? ' show' : ''}`} role="tooltip" id={`popover${uid}`} x-placement={placement} style={style ?? { position: 'absolute', visibility: 'hidden' }}>
            <div className="arrow" style={{ top: '50%', marginTop: '-0.5rem' }}></div>
            <h3 className="popover-header">{title}</h3>
            <div className="popover-body">{content}</div>
          </div>,
          document.body,
        )}
    </>
  );
}
