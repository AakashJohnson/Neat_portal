'use client';
// Bootstrap 4.0.0 modal plugin (assets/theme/js/bootstrap.min.js) without
// jQuery: same DOM sequence, classes, timings and side effects on <body>.
//   show: body padding-right (+ fixed content) for the scrollbar, body.modal-open,
//         <div class="modal-backdrop fade"> appended to body → .show (150 ms),
//         then modal display:block, aria-hidden removed, .show (300 ms), focus.
//   hide: .show removed (300 ms) → display:none, aria-hidden=true, backdrop
//         fades (150 ms) and is removed, body restored.
//   Esc, a click on the modal outside the dialog, and [data-dismiss="modal"] hide it.
// The modal element keeps a static className in JSX; classes/styles are
// changed on the node, as the plugin did.

const TRANSITION = 300;
const BACKDROP_TRANSITION = 150;
const FIXED_CONTENT = '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top';
const instances = new WeakMap();
const reflow = (el) => el.offsetHeight;

function scrollbarWidth() {
  const div = document.createElement('div');
  div.className = 'modal-scrollbar-measure';
  document.body.appendChild(div);
  const w = div.getBoundingClientRect().width - div.clientWidth;
  document.body.removeChild(div);
  return w;
}

class BsModal {
  constructor(element) {
    this.el = element;
    this.dialog = element.querySelector('.modal-dialog');
    this.shown = false;
    this.transitioning = false;
    this.backdrop = null;
    this.saved = [];
    this.ignoreBackdropClick = false;
    this.onKeydown = (e) => {
      if (e.which === 27 || e.keyCode === 27) {
        e.preventDefault();
        this.hide();
      }
    };
    this.onClick = (e) => {
      if (e.target.closest('[data-dismiss="modal"]') && this.el.contains(e.target)) {
        e.preventDefault();
        this.hide();
        return;
      }
      if (this.ignoreBackdropClick) {
        this.ignoreBackdropClick = false;
        return;
      }
      if (e.target === this.el) this.hide();
    };
    this.onDialogMousedown = () => {
      this.el.addEventListener('mouseup', (e) => e.target === this.el && (this.ignoreBackdropClick = true), { once: true });
    };
    this.onFocusin = (e) => {
      if (document !== e.target && this.el !== e.target && !this.el.contains(e.target)) this.el.focus();
    };
  }

  setScrollbar() {
    const rect = document.body.getBoundingClientRect();
    if (!(rect.left + rect.right < window.innerWidth)) return;
    const w = scrollbarWidth();
    const pad = (el) => {
      this.saved.push([el, 'paddingRight', el.style.paddingRight]);
      el.style.paddingRight = `${parseFloat(getComputedStyle(el).paddingRight) + w}px`;
    };
    document.querySelectorAll(FIXED_CONTENT).forEach(pad);
    document.querySelectorAll('.sticky-top').forEach((el) => {
      this.saved.push([el, 'marginRight', el.style.marginRight]);
      el.style.marginRight = `${parseFloat(getComputedStyle(el).marginRight) - w}px`;
    });
    document.querySelectorAll('.navbar-toggler').forEach((el) => {
      this.saved.push([el, 'marginRight', el.style.marginRight]);
      el.style.marginRight = `${parseFloat(getComputedStyle(el).marginRight) + w}px`;
    });
    pad(document.body);
    this.scrollbarWidth = w;
    this.bodyOverflowing = true;
  }

  resetScrollbar() {
    for (const [el, prop, value] of this.saved) el.style[prop] = value;
    this.saved = [];
  }

  show() {
    if (this.transitioning || this.shown) return;
    this.transitioning = true;
    this.shown = true;
    this.bodyOverflowing = false;
    this.setScrollbar();
    // _adjustDialog
    const overflowing = this.el.scrollHeight > document.documentElement.clientHeight;
    if (!this.bodyOverflowing && overflowing) this.el.style.paddingLeft = `${this.scrollbarWidth ?? 0}px`;
    if (this.bodyOverflowing && !overflowing) this.el.style.paddingRight = `${this.scrollbarWidth}px`;
    document.body.classList.add('modal-open');
    this.el.addEventListener('keydown', this.onKeydown);
    this.el.addEventListener('click', this.onClick);
    this.dialog?.addEventListener('mousedown', this.onDialogMousedown);

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop fade';
    document.body.appendChild(this.backdrop);
    reflow(this.backdrop);
    this.backdrop.classList.add('show');
    setTimeout(() => this.showElement(), BACKDROP_TRANSITION);
  }

  showElement() {
    if (!this.el.isConnected) document.body.appendChild(this.el);
    this.el.style.display = 'block';
    this.el.removeAttribute('aria-hidden');
    this.el.scrollTop = 0;
    reflow(this.el);
    this.el.classList.add('show');
    document.addEventListener('focusin', this.onFocusin);
    setTimeout(() => {
      this.el.focus();
      this.transitioning = false;
    }, TRANSITION);
  }

  hide() {
    if (this.transitioning || !this.shown) return;
    this.shown = false;
    this.transitioning = true;
    this.el.removeEventListener('keydown', this.onKeydown);
    document.removeEventListener('focusin', this.onFocusin);
    this.el.classList.remove('show');
    this.el.removeEventListener('click', this.onClick);
    this.dialog?.removeEventListener('mousedown', this.onDialogMousedown);
    setTimeout(() => this.hideModal(), TRANSITION);
  }

  hideModal() {
    this.el.style.display = 'none';
    this.el.setAttribute('aria-hidden', 'true');
    this.transitioning = false;
    const backdrop = this.backdrop;
    backdrop?.classList.remove('show');
    setTimeout(() => {
      backdrop?.remove();
      if (this.backdrop === backdrop) this.backdrop = null;
      document.body.classList.remove('modal-open');
      this.el.style.paddingLeft = '';
      this.el.style.paddingRight = '';
      this.resetScrollbar();
      this.onHidden?.();
    }, BACKDROP_TRANSITION);
  }

  /** Component unmount (route change): finish the cleanup the plugin would do. */
  dispose() {
    if (this.backdrop) this.backdrop.remove();
    document.body.classList.remove('modal-open');
    this.resetScrollbar();
    document.removeEventListener('focusin', this.onFocusin);
  }
}

/** $(el).modal(...) instance for an element. */
export function bsModal(element) {
  if (!element) return null;
  let m = instances.get(element);
  if (!m) {
    m = new BsModal(element);
    instances.set(element, m);
  }
  return m;
}

/**
 * Click handler for a [data-toggle="modal"] trigger: preventDefault on <a>,
 * then toggle the target if it exists (a missing target does nothing); after
 * the modal is hidden, focus returns to the trigger if it is visible.
 */
export function dataToggleModal(event, targetSelector) {
  const trigger = event.currentTarget;
  if (trigger.tagName === 'A' || trigger.tagName === 'AREA') event.preventDefault();
  const target = document.querySelector(targetSelector);
  if (!target) return;
  const m = bsModal(target);
  if (m.shown) {
    m.hide();
    return;
  }
  m.onHidden = () => {
    if (trigger.isConnected && trigger.getClientRects().length) trigger.focus();
  };
  m.show();
}
