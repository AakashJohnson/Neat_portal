'use client';
// Port of AeSelectComponent (@kolkov/angular-editor 1.1.2, the toolbar's
// dropdown): label button, option list, document-click close, arrow/Enter/
// Escape keys while open. `value` is the ngModel value; a value that is not
// among the options leaves the label unchanged (setValue finds nothing).
import { useEffect, useRef, useState } from 'react';

export default function AeSelect({ className, options, value, onSelect, disabled = false }) {
  const host = useRef(null);
  const [opened, setOpened] = useState(false);
  // ngOnInit: selectedOption = options[0]; writeValue(value) then selects a match.
  const [selected, setSelected] = useState(() => options.find((o) => o.value === value) ?? options[0]);
  const [optionId, setOptionId] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const i = options.findIndex((o) => o.value === value);
    if (value && typeof value === 'string' && i >= 0) {
      setSelected(options[i]);
      setOptionId(i);
    }
  }

  useEffect(() => {
    const onDocClick = (e) => {
      if (!host.current?.contains(e.target)) setOpened(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const optionSelect = (option, e) => {
    e.stopPropagation();
    const i = options.indexOf(option);
    setSelected(option);
    setOptionId(i);
    setOpened(false);
    onSelect(option.value);
  };

  const onKeyDown = (e) => {
    if (!opened) return;
    if (e.key === 'ArrowDown' && optionId < options.length - 1) setOptionId(optionId + 1);
    else if (e.key === 'ArrowUp' && optionId >= 1) setOptionId(optionId - 1);
    else if (e.key === 'Enter') optionSelect(options[optionId], e);
    else if (e.key === 'Escape') {
      setOpened(false);
      e.preventDefault();
    }
  };

  const label = selected && Object.prototype.hasOwnProperty.call(selected, 'label') ? selected.label : 'Select';
  return (
    <ae-select ref={host} class={className} tabIndex="-1" style={{ display: 'inline-block' }} onKeyDown={onKeyDown}>
      <span className={`ae-font ae-picker${opened ? ' ae-expanded' : ''}`}>
        {/* [tabIndex]="-1" overrides the static tabindex="0" */}
        <button
          tabIndex="-1"
          type="button"
          role="button"
          className={`ae-picker-label${disabled ? ' disabled' : ''}`}
          disabled={disabled}
          onClick={() => !disabled && setOpened((o) => !o)}
        >
          {`${label} `}
          <svg viewBox="0 0 18 18">
            <polygon className="ae-stroke" points="7 11 9 13 11 11 7 11"></polygon>
            <polygon className="ae-stroke" points="7 7 9 5 11 7 7 7"></polygon>
          </svg>
        </button>
        <span className="ae-picker-options">
          {options.map((item, i) => (
            <button
              key={item.value}
              tabIndex="-1"
              type="button"
              role="button"
              className={`ae-picker-item${item.value === selected?.value ? ' selected' : ''}${i === optionId ? ' focused' : ''}`}
              onClick={(e) => optionSelect(item, e)}
            >
              {` ${item.label} `}
            </button>
          ))}
          {!options.length && <span className="dropdown-item">No items for select</span>}
        </span>
      </span>
    </ae-select>
  );
}
