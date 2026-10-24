'use client';
// matTooltip (Angular Material 7.3.7) for a single child element: shown on
// mouseenter and hidden on mouseleave (delays 0), rendered in the shared CDK
// overlay container as
//   .cdk-overlay-connected-position-bounding-box > .cdk-overlay-pane.mat-tooltip-panel > .mat-tooltip
// positioned with the CDK exact strategy (main position, then the mirrored
// fallback, then pushed on screen with an 8 px viewport margin), and the
// 'state' animation (scale 0→1 in 200 ms, fade out in 100 ms). The message is
// registered for screen readers like AriaDescriber (aria-describedby).
import { cloneElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getOverlayContainer, nextOverlayId } from '@/components/cdk/overlay';

const VIEWPORT_MARGIN = 8;
let describedById = 0;

function positionsFor(position) {
  switch (position) {
    case 'above':
      return [{ ox: 'center', oy: 'top', px: 'center', py: 'bottom' }, { ox: 'center', oy: 'bottom', px: 'center', py: 'top' }];
    case 'below':
      return [{ ox: 'center', oy: 'bottom', px: 'center', py: 'top' }, { ox: 'center', oy: 'top', px: 'center', py: 'bottom' }];
    case 'left':
    case 'before':
      return [{ ox: 'start', oy: 'center', px: 'end', py: 'center' }, { ox: 'end', oy: 'center', px: 'start', py: 'center' }];
    default: // right / after
      return [{ ox: 'end', oy: 'center', px: 'start', py: 'center' }, { ox: 'start', oy: 'center', px: 'end', py: 'center' }];
  }
}

const pick = (rect, x, y) => ({
  x: x === 'start' ? rect.left : x === 'end' ? rect.right : rect.left + rect.width / 2,
  y: y === 'top' ? rect.top : y === 'bottom' ? rect.bottom : rect.top + rect.height / 2,
});

export default function MatTooltip({ message, position = 'below', disabled = false, children }) {
  const [host, setHost] = useState(null); // callback ref: the host element
  const paneRef = useRef(null);
  const [visibility, setVisibility] = useState('initial'); // initial | visible | hidden
  const [attached, setAttached] = useState(false);
  const [style, setStyle] = useState(null);
  const [ids] = useState(() => ({ message: `cdk-describedby-message-${describedById++}` }));
  const [overlayId, setOverlayId] = useState(null);

  // AriaDescriber: hidden message element + aria-describedby on the host.
  useEffect(() => {
    if (!message) return;
    let container = document.getElementById('cdk-describedby-message-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cdk-describedby-message-container';
      container.setAttribute('aria-hidden', 'true');
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.id = ids.message;
    el.textContent = message;
    container.appendChild(el);
    return () => el.remove();
  }, [message, ids.message]);

  const show = () => {
    if (disabled || !message) return; // matTooltipDisabled
    if (!attached) {
      setOverlayId(nextOverlayId());
      setStyle(null);
      setAttached(true);
    }
    setVisibility('visible');
  };
  const hide = () => setVisibility('hidden');

  // Detach after the hide animation (afterHidden → _detach()).
  useEffect(() => {
    if (visibility !== 'hidden') return;
    const t = setTimeout(() => setAttached(false), 100);
    return () => clearTimeout(t);
  }, [visibility]);

  useLayoutEffect(() => {
    if (!attached || style || !paneRef.current || !host) return;
    const origin = host.getBoundingClientRect();
    const overlay = paneRef.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const place = (p) => {
      const o = pick(origin, p.ox, p.oy);
      const x = o.x + (p.px === 'start' ? 0 : p.px === 'end' ? -overlay.width : -overlay.width / 2);
      const y = o.y + (p.py === 'top' ? 0 : p.py === 'bottom' ? -overlay.height : -overlay.height / 2);
      return { x, y, p };
    };
    const fits = ({ x, y }) => x >= 0 && y >= 0 && x + overlay.width <= vw && y + overlay.height <= vh;
    const candidates = positionsFor(position).map(place);
    let chosen = candidates.find(fits);
    if (!chosen) {
      // _pushOverlayOnScreen with the viewport margin.
      const c = candidates[0];
      const x = Math.min(Math.max(c.x, VIEWPORT_MARGIN), vw - overlay.width - VIEWPORT_MARGIN);
      const y = Math.min(Math.max(c.y, VIEWPORT_MARGIN), vh - overlay.height - VIEWPORT_MARGIN);
      chosen = { ...c, x, y };
    }
    const originX = chosen.p.px === 'start' ? 'left' : chosen.p.px === 'end' ? 'right' : 'center';
    const originY = chosen.p.py === 'top' ? 'top' : chosen.p.py === 'bottom' ? 'bottom' : 'center';
    setStyle({ pane: { top: `${chosen.y}px`, left: `${chosen.x}px` }, transformOrigin: `${originX} ${originY}` });
  }, [attached, style, position, host]);

  const child = cloneElement(children, {
    ref: setHost,
    'aria-describedby': message ? ids.message : undefined,
    onMouseEnter: (e) => {
      children.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e) => {
      children.props.onMouseLeave?.(e);
      hide();
    },
  });

  const tooltipStyle =
    visibility === 'visible' && style
      ? { transform: 'scale(1)', opacity: 1, transition: 'transform 200ms cubic-bezier(0, 0, 0.2, 1), opacity 200ms cubic-bezier(0, 0, 0.2, 1)' }
      : visibility === 'hidden'
        ? { transform: 'scale(1)', opacity: 0, transition: 'opacity 100ms cubic-bezier(0, 0, 0.2, 1)' }
        : { transform: 'scale(0)', opacity: 0 };

  return (
    <>
      {child}
      {attached &&
        createPortal(
          <div className="cdk-overlay-connected-position-bounding-box" dir="ltr" style={{ top: 0, left: 0, height: '100%', width: '100%' }}>
            <div ref={paneRef} id={overlayId} className="cdk-overlay-pane mat-tooltip-panel" style={style ? style.pane : { visibility: 'hidden' }}>
              <div className="mat-tooltip" style={{ transformOrigin: style?.transformOrigin, ...tooltipStyle }}>
                {message}
              </div>
            </div>
          </div>,
          getOverlayContainer(),
        )}
    </>
  );
}
