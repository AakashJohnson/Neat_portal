// jQuery 3.7.1 effects used by the Angular templates through `$(...)`, without
// jQuery. Same visible result: properties, duration, 'swing' easing, overflow
// handling and final inline styles.

const SPEEDS = { slow: 600, fast: 200, _default: 400 };
const SLIDE_PROPS = ['height', 'marginTop', 'marginBottom', 'paddingTop', 'paddingBottom'];
const swing = (p) => 0.5 - Math.cos(p * Math.PI) / 2;
const running = new WeakMap(); // element → { cancel, showing, current }

const isHidden = (el) => getComputedStyle(el).display === 'none' || !el.getClientRects().length;

/**
 * $(el).slideToggle(speed): hidden → slideDown, visible → slideUp. A toggle
 * while animating reverses from the current values (as jQuery's queue-less
 * "toggle" does via dataShow.hidden).
 */
export function slideToggle(el, speed = '_default') {
  if (!el) return;
  const duration = typeof speed === 'number' ? speed : (SPEEDS[speed] ?? SPEEDS._default);
  const prev = running.get(el);
  const show = prev ? !prev.showing : isHidden(el);

  // Original inline values restored when the animation completes.
  const saved = prev?.saved ?? {
    display: el.style.display,
    overflow: el.style.overflow,
    overflowX: el.style.overflowX,
    overflowY: el.style.overflowY,
    ...Object.fromEntries(SLIDE_PROPS.map((p) => [p, el.style[p]])),
  };
  prev?.cancel();

  // Full (shown) values: measure with the element displayed and props unset.
  if (show && !prev && isHidden(el)) el.style.display = saved.display === 'none' ? '' : saved.display;
  if (getComputedStyle(el).display === 'none') el.style.display = 'block';
  const current = Object.fromEntries(SLIDE_PROPS.map((p) => [p, parseFloat(getComputedStyle(el)[p]) || 0]));
  SLIDE_PROPS.forEach((p) => (el.style[p] = saved[p]));
  const full = Object.fromEntries(SLIDE_PROPS.map((p) => [p, parseFloat(getComputedStyle(el)[p]) || 0]));

  const from = prev ? prev.current : show ? Object.fromEntries(SLIDE_PROPS.map((p) => [p, 0])) : current;
  const to = show ? full : Object.fromEntries(SLIDE_PROPS.map((p) => [p, 0]));

  el.style.overflow = 'hidden';
  el.style.overflowX = 'hidden';
  el.style.overflowY = 'hidden';
  const apply = (values) => SLIDE_PROPS.forEach((p) => (el.style[p] = `${values[p]}px`));
  apply(from);

  const state = { showing: show, saved, current: { ...from }, cancel: () => cancelAnimationFrame(state.raf) };
  running.set(el, state);
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = swing(p);
    state.current = Object.fromEntries(SLIDE_PROPS.map((k) => [k, from[k] + (to[k] - from[k]) * eased]));
    apply(state.current);
    if (p < 1) {
      state.raf = requestAnimationFrame(step);
      return;
    }
    running.delete(el);
    // complete: restore the original inline styles; hide sets display:none.
    for (const [k, v] of Object.entries(saved)) el.style[k] = v;
    el.style.display = show ? (saved.display === 'none' ? '' : saved.display) : 'none';
    if (show && getComputedStyle(el).display === 'none') el.style.display = 'block'; // hidden by a stylesheet
  };
  state.raf = requestAnimationFrame(step);
}
