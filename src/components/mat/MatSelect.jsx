'use client';
// <mat-select>/<mat-option> (Angular Material 7.3.7, single selection) with
// the same DOM, classes, overlay structure, positioning maths and keyboard
// behaviour, so legacy.css (theme) + material.css (component styles) render it
// as before. Ported from @angular/material/esm2015/select.js and the CDK
// FlexibleConnectedPositionStrategy (exact positioning, cdkConnectedOverlay
// defaults). Ripples are not reproduced.
//
//   <MatSelect className="form-control" placeholder="…" {...form.bindValue('x')}
//              onSelectionChange={(value) => …} invalid={…}>
//     <MatOption value="a">A</MatOption>
//     <MatOption>None</MatOption>          // value undefined → clears the selection
//   </MatSelect>
import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getOverlayContainer, nextOverlayId } from '@/components/cdk/overlay';

const SELECT_PANEL_MAX_HEIGHT = 256;
const SELECT_PANEL_PADDING_X = 16;
const SELECT_ITEM_HEIGHT_EM = 3;
const SELECT_PANEL_VIEWPORT_PADDING = 8;
const POSITIONS = [
  { originY: 'top', overlayY: 'top' },
  { originY: 'bottom', overlayY: 'bottom' },
];
const KEY = { ENTER: 13, SPACE: 32, END: 35, HOME: 36, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, TAB: 9, ESC: 27 };

/** Marker component: MatSelect reads its props (value, disabled, children). */
export function MatOption() {
  return null;
}

const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf(node.props.children);
  return '';
};

/**
 * MatOption children → options. Plain HTML elements (e.g. a stray <option>)
 * are projected into the panel as-is by Material (ng-content) but are not
 * options: they are kept as `extras` with their position.
 */
function collectOptions(children, out = [], extras = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === MatOption) {
      out.push({ value: child.props.value, disabled: !!child.props.disabled, content: child.props.children, viewValue: textOf(child.props.children).trim() });
    } else if (typeof child.type === 'string') {
      extras.push({ before: out.length, tag: child.type, attrs: child.props, text: textOf(child.props.children) });
    } else if (child.props?.children) collectOptions(child.props.children, out, extras);
  });
  return Object.assign(out, { extras });
}

const hasModifierKey = (e) => e.altKey || e.shiftKey || e.ctrlKey || e.metaKey;

export function MatSelect({
  value,
  onChange,
  onBlur,
  onSelectionChange,
  placeholder,
  className = '',
  disabled = false,
  required = false,
  invalid = false, // errorState: control.invalid && (touched || form submitted)
  onOpenedChange, // (opened) => … — e.g. a surrounding MatFormField (shouldLabelFloat)
  children,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = `mat-select-${uid}`;
  const options = collectOptions(children);
  // _setSelectionByValue with compareWith (===); null/undefined never matches.
  const selectedIndex = options.findIndex((o) => o.value != null && o.value === value);
  const empty = selectedIndex < 0;

  const hostRef = useRef(null);
  const triggerRef = useRef(null);
  const paneRef = useRef(null);
  const panelRef = useRef(null);
  const typeahead = useRef({ text: '', timer: null });

  const [open, setOpenState] = useState(false);
  const setOpen = (v) => {
    setOpenState(v);
    onOpenedChange?.(v);
  };
  const [activeIndex, setActiveIndex] = useState(-1);
  const [geometry, setGeometry] = useState(null); // computed on open
  const [placement, setPlacement] = useState(null); // pane styles after measuring
  const [overlayId, setOverlayId] = useState(null);
  const [animState, setAnimState] = useState('void');

  // ---- selection -----------------------------------------------------------
  const selectIndex = (index) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (option.value == null) {
      // option.value == null && !multiple → clear and propagate the option's value.
      // In MatSelect._onSelect, option.deselect() re-emits the option's selection
      // event, so _onSelect runs re-entrantly and _propagateChanges() fires twice:
      // valueChange/selectionChange are emitted two times for a null option.
      for (let k = 0; k < 2; k++) {
        onChange?.(option.value);
        onSelectionChange?.(option.value);
      }
    } else if (index !== selectedIndex) {
      onChange?.(option.value);
      onSelectionChange?.(option.value);
    }
  };

  // ---- ListKeyManager ------------------------------------------------------
  const nextEnabled = (from, delta) => {
    for (let i = from + delta; i >= 0 && i < options.length; i += delta) if (!options[i].disabled) return i;
    return -1;
  };
  const firstEnabled = () => nextEnabled(-1, 1);
  const lastEnabled = () => nextEnabled(options.length, -1);

  const setActive = (index, { selectIfClosed } = {}) => {
    if (index < 0) return;
    setActiveIndex(index);
    if (selectIfClosed) selectIndex(index); // keyManager.change while closed → _selectViaInteraction
  };

  const keyManagerOnKeydown = (e, horizontal) => {
    const current = activeIndex >= 0 ? activeIndex : -1;
    const closed = !open;
    switch (e.keyCode) {
      case KEY.DOWN:
        setActive(nextEnabled(current, 1), { selectIfClosed: closed });
        e.preventDefault();
        return;
      case KEY.UP:
        setActive(current < 0 ? lastEnabled() : nextEnabled(current, -1), { selectIfClosed: closed });
        e.preventDefault();
        return;
      case KEY.RIGHT:
        if (horizontal) {
          setActive(nextEnabled(current, 1), { selectIfClosed: closed });
          e.preventDefault();
        }
        return;
      case KEY.LEFT:
        if (horizontal) {
          setActive(current < 0 ? lastEnabled() : nextEnabled(current, -1), { selectIfClosed: closed });
          e.preventDefault();
        }
        return;
      case KEY.TAB:
        if (open) close(); // tabOut
        return;
      default: {
        // withTypeAhead(200): letters/digits accumulate, first matching label wins.
        const key = e.key;
        if (key && key.length === 1 && /[a-z0-9]/i.test(key) && !e.ctrlKey && !e.metaKey) {
          const t = typeahead.current;
          clearTimeout(t.timer);
          t.text += key.toUpperCase();
          const start = current < 0 ? 0 : current + 1;
          for (let k = 0; k < options.length; k++) {
            const i = (start + k) % options.length;
            if (!options[i].disabled && options[i].viewValue.toUpperCase().startsWith(t.text)) {
              setActive(i, { selectIfClosed: closed });
              break;
            }
          }
          t.timer = setTimeout(() => (t.text = ''), 200);
        }
      }
    }
  };

  // ---- open / close --------------------------------------------------------
  const openPanel = () => {
    if (disabled || !options.length || open) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const fontSize = parseInt(getComputedStyle(triggerRef.current).fontSize || '0', 10);
    const itemHeight = fontSize * SELECT_ITEM_HEIGHT_EM;
    const items = options.length;
    const panelHeight = Math.min(items * itemHeight, SELECT_PANEL_MAX_HEIGHT);
    const maxScroll = items * itemHeight - panelHeight;
    const selectedOptionOffset = empty ? 0 : selectedIndex;
    const scrollBuffer = panelHeight / 2;

    // _calculateOverlayScroll
    let scrollTop = Math.min(Math.max(0, itemHeight * selectedOptionOffset - scrollBuffer + itemHeight / 2), maxScroll);
    // _calculateOverlayOffsetY
    const optionHeightAdjustment = (itemHeight - triggerRect.height) / 2;
    const maxOptionsDisplayed = Math.floor(SELECT_PANEL_MAX_HEIGHT / itemHeight);
    let optionOffsetFromPanelTop;
    if (scrollTop === 0) optionOffsetFromPanelTop = selectedOptionOffset * itemHeight;
    else if (scrollTop === maxScroll) {
      const firstDisplayedIndex = items - maxOptionsDisplayed;
      const partialItemHeight = itemHeight - ((items * itemHeight - SELECT_PANEL_MAX_HEIGHT) % itemHeight);
      optionOffsetFromPanelTop = (selectedOptionOffset - firstDisplayedIndex) * itemHeight + partialItemHeight;
    } else optionOffsetFromPanelTop = scrollBuffer - itemHeight / 2;
    let offsetY = Math.round(optionOffsetFromPanelTop * -1 - optionHeightAdjustment);

    // _checkOverlayWithinViewport
    const originFor = () => `50% ${Math.abs(offsetY) - optionHeightAdjustment + itemHeight / 2}px 0px`;
    const viewportHeight = document.documentElement.clientHeight;
    const topSpaceAvailable = triggerRect.top - SELECT_PANEL_VIEWPORT_PADDING;
    const bottomSpaceAvailable = viewportHeight - triggerRect.bottom - SELECT_PANEL_VIEWPORT_PADDING;
    const panelHeightTop = Math.abs(offsetY);
    const panelHeightBottom = panelHeight - panelHeightTop - triggerRect.height;
    let transformOrigin;
    if (panelHeightBottom > bottomSpaceAvailable) {
      const distanceBelowViewport = Math.round(panelHeightBottom - bottomSpaceAvailable);
      scrollTop -= distanceBelowViewport;
      offsetY -= distanceBelowViewport;
      transformOrigin = originFor();
      if (scrollTop <= 0) {
        scrollTop = 0;
        offsetY = 0;
        transformOrigin = '50% bottom 0px';
      }
    } else if (panelHeightTop > topSpaceAvailable) {
      const distanceAboveViewport = Math.round(panelHeightTop - topSpaceAvailable);
      scrollTop += distanceAboveViewport;
      offsetY += distanceAboveViewport;
      transformOrigin = originFor();
      if (scrollTop >= maxScroll) {
        scrollTop = maxScroll;
        offsetY = 0;
        transformOrigin = '50% top 0px';
      }
    } else transformOrigin = originFor();

    setGeometry({ triggerRect, fontSize, scrollTop, offsetY, transformOrigin });
    setPlacement(null);
    setOverlayId(nextOverlayId());
    setAnimState('void');
    // _highlightCorrectOption
    setActiveIndex(empty ? firstEnabled() : selectedIndex);
    setOpen(true);
  };

  const close = () => {
    if (!open) return;
    setOpen(false);
    onBlur?.(); // close() calls _onTouched()
  };

  // Position the pane once its size is known (cdk apply() + _calculateOverlayOffsetX).
  useLayoutEffect(() => {
    if (!open || !geometry || placement || !paneRef.current) return;
    const { triggerRect, offsetY } = geometry;
    const pane = paneRef.current;
    const overlayRect = pane.getBoundingClientRect();
    const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    let chosen = null;
    let fallback = null;
    for (const pos of POSITIONS) {
      const x = triggerRect.left;
      const y = (pos.originY === 'top' ? triggerRect.top : triggerRect.bottom) + (pos.overlayY === 'top' ? 0 : -overlayRect.height);
      const fx = x;
      const fy = y + offsetY;
      const visW = Math.max(0, overlayRect.width - Math.max(0, -fx) - Math.max(0, fx + overlayRect.width - viewport.width));
      const visH = Math.max(0, overlayRect.height - Math.max(0, -fy) - Math.max(0, fy + overlayRect.height - viewport.height));
      const area = visW * visH;
      if (area === overlayRect.width * overlayRect.height) {
        chosen = { pos, x, y };
        break;
      }
      if (!fallback || fallback.area < area) fallback = { pos, x, y, area };
    }
    const at = chosen ?? fallback;
    const vertical = at.pos.overlayY === 'bottom' ? { bottom: `${viewport.height - (at.y + overlayRect.height)}px` } : { top: `${at.y}px` };

    // _calculateOverlayOffsetX (after the first position): -16 px, kept on screen.
    const left = at.x;
    let offsetX = -SELECT_PANEL_PADDING_X;
    const paddingWidth = SELECT_PANEL_PADDING_X * 2;
    const leftOverflow = 0 - (left + offsetX);
    const rightOverflow = left + overlayRect.width + offsetX - viewport.width + paddingWidth;
    if (leftOverflow > 0) offsetX += leftOverflow + SELECT_PANEL_VIEWPORT_PADDING;
    else if (rightOverflow > 0) offsetX -= rightOverflow + SELECT_PANEL_VIEWPORT_PADDING;
    offsetX = Math.round(offsetX);

    const transform = `${offsetX ? `translateX(${offsetX}px) ` : ''}${offsetY ? `translateY(${offsetY}px)` : ''}`.trim();
    setPlacement({ left: `${left}px`, ...vertical, transform });
  }, [open, geometry, placement]);

  const extrasKey = JSON.stringify(options.extras.map((e) => [e.before, e.tag, e.text]));
  // Projected non-option content (inserted through the DOM: React would reject
  // e.g. <option> inside a <div>).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel || !options.extras.length) return;
    const nodes = options.extras.map(({ before, tag, attrs, text }) => {
      const el = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) if (k !== 'children' && typeof v !== 'function' && typeof v !== 'object') el.setAttribute(k === 'className' ? 'class' : k, String(v));
      el.textContent = text;
      panel.insertBefore(el, panel.querySelectorAll(':scope > mat-option')[before] ?? null);
      return el;
    });
    return () => nodes.forEach((n) => n.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content
  }, [open, extrasKey]);

  // Panel scroll position, then the showing animation.
  useLayoutEffect(() => {
    if (!open || !placement || !panelRef.current) return;
    panelRef.current.scrollTop = geometry.scrollTop;
    const raf = requestAnimationFrame(() => setAnimState('showing'));
    return () => cancelAnimationFrame(raf);
  }, [open, placement, geometry]);

  // Keep the active option visible while navigating (_scrollActiveOptionIntoView).
  useEffect(() => {
    if (!open || !panelRef.current || activeIndex < 0 || !geometry) return;
    const itemHeight = geometry.fontSize * SELECT_ITEM_HEIGHT_EM;
    const panel = panelRef.current;
    const optionOffset = activeIndex * itemHeight;
    if (optionOffset < panel.scrollTop) panel.scrollTop = optionOffset;
    else if (optionOffset + itemHeight > panel.scrollTop + SELECT_PANEL_MAX_HEIGHT) panel.scrollTop = Math.max(0, optionOffset - SELECT_PANEL_MAX_HEIGHT + itemHeight);
  }, [activeIndex, open, geometry]);

  // Reposition on scroll/resize (reposition scroll strategy; position locked).
  useEffect(() => {
    if (!open) return;
    const reposition = () => setGeometry((g) => (g ? { ...g, triggerRect: triggerRef.current.getBoundingClientRect() } : g)) || setPlacement(null);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  // ---- events --------------------------------------------------------------
  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      const isArrow = [KEY.DOWN, KEY.UP, KEY.LEFT, KEY.RIGHT].includes(e.keyCode);
      if (((e.keyCode === KEY.ENTER || e.keyCode === KEY.SPACE) && !hasModifierKey(e)) || (e.altKey && isArrow)) {
        e.preventDefault();
        openPanel();
      } else if (e.keyCode === KEY.HOME || e.keyCode === KEY.END) {
        setActive(e.keyCode === KEY.HOME ? firstEnabled() : lastEnabled(), { selectIfClosed: true });
        e.preventDefault();
      } else {
        // closed: activeItem starts at the selected option
        if (activeIndex < 0 && !empty) setActiveIndex(selectedIndex);
        keyManagerOnKeydown(e, true);
      }
      return;
    }
    if (e.keyCode === KEY.HOME || e.keyCode === KEY.END) {
      e.preventDefault();
      setActive(e.keyCode === KEY.HOME ? firstEnabled() : lastEnabled());
    } else if ((e.keyCode === KEY.UP || e.keyCode === KEY.DOWN) && e.altKey) {
      e.preventDefault();
      close();
    } else if ((e.keyCode === KEY.ENTER || e.keyCode === KEY.SPACE) && activeIndex >= 0 && !hasModifierKey(e)) {
      e.preventDefault();
      selectIndex(activeIndex);
      close();
      hostRef.current?.focus();
    } else if (e.keyCode === KEY.ESC) {
      close(); // overlay keydown ESC detaches → close()
    } else keyManagerOnKeydown(e, false);
  };

  const classes = [
    'mat-select',
    className,
    disabled && 'mat-select-disabled',
    invalid && 'mat-select-invalid',
    required && 'mat-select-required',
    empty && 'mat-select-empty',
  ]
    .filter(Boolean)
    .join(' ');

  const triggerValue = empty ? '' : options[selectedIndex].viewValue;
  const panelId = `${id}-panel`;

  return (
    <mat-select
      ref={hostRef}
      class={classes}
      role="listbox"
      id={id}
      tabindex={disabled ? '-1' : '0'}
      aria-label={placeholder || null}
      // Static template attributes stay on the host element in Angular.
      placeholder={placeholder}
      required={required ? '' : undefined}
      aria-required={String(required)}
      aria-disabled={String(disabled)}
      aria-invalid={String(invalid)}
      aria-multiselectable="false"
      onKeyDown={onKeyDown}
      onBlur={() => {
        if (!disabled && !open) onBlur?.();
      }}
      {...rest}
    >
      <div ref={triggerRef} className="mat-select-trigger" aria-hidden="true" onClick={() => (open ? close() : openPanel())}>
        <div className="mat-select-value">
          {empty ? (
            <span className="mat-select-placeholder">{placeholder || ' '}</span>
          ) : (
            <span className="mat-select-value-text">
              <span>{triggerValue || ' '}</span>
            </span>
          )}
        </div>
        <div className="mat-select-arrow-wrapper">
          <div className="mat-select-arrow"></div>
        </div>
      </div>
      {open &&
        geometry &&
        createPortal(
          <>
            <div className="cdk-overlay-backdrop cdk-overlay-transparent-backdrop cdk-overlay-backdrop-showing" onClick={close}></div>
            <div className="cdk-overlay-connected-position-bounding-box" dir="ltr" style={{ top: 0, left: 0, height: '100%', width: '100%' }}>
              <div
                ref={paneRef}
                id={overlayId}
                className="cdk-overlay-pane"
                style={{ minWidth: `${geometry.triggerRect.width}px`, fontSize: `${geometry.fontSize}px`, ...(placement ?? { visibility: 'hidden' }) }}
              >
                <div className="mat-select-panel-wrap">
                  <div
                    ref={panelRef}
                    role="listbox"
                    tabIndex={-1}
                    id={panelId}
                    aria-multiselectable="false"
                    className="mat-select-panel mat-primary"
                    onKeyDown={onKeyDown}
                    style={{
                      transformOrigin: geometry.transformOrigin,
                      fontSize: `${geometry.fontSize}px`,
                      transition: 'opacity 120ms cubic-bezier(0, 0, 0.2, 1), transform 120ms cubic-bezier(0, 0, 0.2, 1), min-width 120ms cubic-bezier(0, 0, 0.2, 1)',
                      ...(animState === 'showing'
                        ? { opacity: 1, minWidth: 'calc(100% + 32px)', transform: 'scaleY(1)' }
                        : { opacity: 0, minWidth: '100%', transform: 'scaleY(0.8)' }),
                    }}
                  >
                    {options.map((option, i) => (
                      <mat-option
                        key={i}
                        class={['mat-option', i === selectedIndex && 'mat-selected', i === activeIndex && 'mat-active', option.disabled && 'mat-option-disabled'].filter(Boolean).join(' ')}
                        role="option"
                        tabindex={option.disabled ? '-1' : '0'}
                        id={`mat-option-${uid}-${i}`}
                        aria-selected={i === selectedIndex ? 'true' : undefined}
                        aria-disabled={String(option.disabled)}
                        onClick={() => {
                          if (option.disabled) return;
                          setActiveIndex(i);
                          selectIndex(i);
                          close();
                          hostRef.current?.focus();
                        }}
                      >
                        <span className="mat-option-text">{option.content}</span>
                        <div className="mat-option-ripple mat-ripple"></div>
                      </mat-option>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>,
          getOverlayContainer(),
        )}
    </mat-select>
  );
}
