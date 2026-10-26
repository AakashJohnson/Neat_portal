'use client';


import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MatInput from '@/components/mat/MatInput';
import { getOverlayContainer, nextOverlayId } from '@/components/cdk/overlay';

let autocompleteId = 0;

export default function MatAutocomplete({ id, value, onChange, options, onOptionSelected, placeholder, ...rest }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [panelId] = useState(() => `mat-autocomplete-${autocompleteId++}`);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [overlayId, setOverlayId] = useState(null);
  const [placement, setPlacement] = useState(null);
  const inputRef = useRef(null);
  const paneRef = useRef(null);
  const showPanel = open && (options.length > 0 || String(value ?? '').trim().length > 0);

  const openPanel = () => {
    if (!open) {
      setOverlayId(nextOverlayId());
      setPlacement(null);
    }
    setOpen(true);
  };
  const closePanel = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  // Outside click closes the panel.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (inputRef.current?.contains(e.target) || paneRef.current?.contains(e.target)) return;
      closePanel();
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!showPanel || !paneRef.current || !inputRef.current) return;
    const origin = (inputRef.current.closest('.mat-form-field-flex') ?? inputRef.current).getBoundingClientRect();
    const pane = paneRef.current.getBoundingClientRect();
    const vh = document.documentElement.clientHeight;
    const below = origin.bottom + pane.height <= vh;
    const next = below ? { top: `${origin.bottom}px`, left: `${origin.left}px`, above: false } : { top: `${origin.top - pane.height}px`, left: `${origin.left}px`, above: true };
    setPlacement((p) => (p && p.top === next.top && p.left === next.left && p.above === next.above ? p : { ...next, width: `${origin.width}px` }));
  }, [showPanel, options.length]);

  const select = (option) => {
    onChange?.(option.value);
    onOptionSelected?.(option.value);
    closePanel();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      closePanel();
    } else if (e.key === 'Enter' && open && activeIndex >= 0 && options[activeIndex]) {
      e.preventDefault();
      select(options[activeIndex]);
    } else if (e.key === 'Tab') closePanel();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openPanel();
      if (!options.length) return;
      const n = options.length;
      setActiveIndex((i) => (e.key === 'ArrowDown' ? (i + 1) % n : i <= 0 ? n - 1 : i - 1));
    }
  };

  return (
    <>
      <MatInput
        ref={inputRef}
        id={id}
        value={value ?? ''}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-activedescendant={showPanel && activeIndex >= 0 ? `mat-option-${uid}-${activeIndex}` : undefined}
        aria-expanded={String(showPanel)}
        aria-haspopup="true"
        aria-owns={showPanel ? panelId : undefined}
        onFocus={openPanel}
        onChange={(e) => {
          onChange?.(e.target.value);
          setActiveIndex(-1);
          openPanel();
        }}
        onKeyDown={onKeyDown}
        {...rest}
      />
      {showPanel &&
        createPortal(
          <div className="cdk-overlay-connected-position-bounding-box" dir="ltr" style={{ top: 0, left: 0, height: '100%', width: '100%' }}>
            <div ref={paneRef} id={overlayId} className="cdk-overlay-pane" style={{ width: placement?.width, top: placement?.top, left: placement?.left, ...(placement ? {} : { visibility: 'hidden' }) }}>
              <div className={`mat-autocomplete-panel mat-autocomplete-visible${placement?.above ? ' mat-autocomplete-panel-above' : ''}`} role="listbox" id={panelId}>
                {options.length === 0 && <div role="status" className="mat-option mat-option-disabled">No results found.</div>}
                {options.map((option, i) => (
                  <mat-option
                    key={i}
                    class={`mat-option${i === activeIndex ? ' mat-active' : ''}`}
                    role="option"
                    tabindex="0"
                    id={`mat-option-${uid}-${i}`}
                    aria-disabled="false"
                    onClick={() => select(option)}
                  >
                    <span className="mat-option-text">{option.label}</span>
                    <div className="mat-option-ripple mat-ripple" mat-ripple=""></div>
                  </mat-option>
                ))}
              </div>
            </div>
          </div>,
          getOverlayContainer(),
        )}
    </>
  );
}
