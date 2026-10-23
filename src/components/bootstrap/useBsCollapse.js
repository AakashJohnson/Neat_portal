'use client';
// Bootstrap 4 collapse plugin (assets/theme/js/bootstrap.min.js, used through
// data-toggle="collapse") without jQuery. Same DOM effects, so the theme CSS
// and its `.collapsing { transition: height .35s ease }` apply unchanged:
//   show: .collapse → .collapsing (height 0 → scrollHeight) → .collapse.show
//   hide: .collapse.show → .collapsing (height → 0) → .collapse
//   trigger: class "collapsed" + aria-expanded follow the state.
// The elements keep a static className in JSX; classes are changed on the DOM
// node exactly as the plugin did (React does not touch an unchanged className).
import { useCallback, useRef } from 'react';

const EMULATED_END = 600; // emulateTransitionEnd(600)

export function useBsCollapse({ withParent = false } = {}) {
  const target = useRef(null);
  const trigger = useRef(null);
  const busy = useRef(false);
  const initialised = useRef(false);

  const setTrigger = (expanded) => {
    const t = trigger.current;
    if (!t) return;
    t.classList.toggle('collapsed', !expanded);
    t.setAttribute('aria-expanded', String(expanded));
  };

  const afterTransition = (el, done) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      el.removeEventListener('transitionend', finish);
      done();
    };
    el.addEventListener('transitionend', finish);
    setTimeout(finish, EMULATED_END);
  };

  const show = (el) => {
    el.classList.remove('collapse');
    el.classList.add('collapsing');
    el.style.height = '0px';
    setTrigger(true);
    busy.current = true;
    afterTransition(el, () => {
      el.classList.remove('collapsing');
      el.classList.add('collapse', 'show');
      el.style.height = '';
      busy.current = false;
    });
    el.style.height = `${el.scrollHeight}px`;
  };

  const hide = (el) => {
    el.style.height = `${el.getBoundingClientRect().height}px`;
    void el.offsetHeight; // reflow
    el.classList.add('collapsing');
    el.classList.remove('collapse', 'show');
    setTrigger(false);
    busy.current = true;
    afterTransition(el, () => {
      busy.current = false;
      el.classList.remove('collapsing');
      el.classList.add('collapse');
    });
    el.style.height = '';
  };

  const toggle = useCallback((e) => {
    // The data-api handler prevented the default action of <a> triggers.
    if (e?.currentTarget?.tagName === 'A') e.preventDefault();
    const el = target.current;
    if (!el || busy.current) return;
    if (!initialised.current) {
      initialised.current = true;
      // With data-parent, _getParent() first syncs the trigger to the current state.
      if (withParent) setTrigger(el.classList.contains('show'));
    }
    if (el.classList.contains('show')) hide(el);
    else show(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withParent]);

  return { target, trigger, toggle };
}
