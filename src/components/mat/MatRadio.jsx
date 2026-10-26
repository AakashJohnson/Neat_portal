'use client';


import { createContext, useContext, useId } from 'react';

const GroupContext = createContext(null);

export function MatRadioGroup({ name, value, onChange, children, className = '', ...rest }) {
  const autoName = useId();
  return (
    <GroupContext.Provider value={{ name: name ?? `mat-radio-group-${autoName}`, value, onChange }}>
      <mat-radio-group class={`mat-radio-group ${className}`.trim()} role="radiogroup" {...rest}>
        {children}
      </mat-radio-group>
    </GroupContext.Provider>
  );
}

export function MatRadioButton({ value, children, color = 'accent', disabled = false }) {
  const group = useContext(GroupContext);
  const id = `mat-radio-${useId().replace(/:/g, '')}`;
  const checked = group?.value === value;
  const classes = ['mat-radio-button', `mat-${color}`, checked && 'mat-radio-checked', disabled && 'mat-radio-disabled'].filter(Boolean).join(' ');
  return (
    <mat-radio-button class={classes} id={id} tabindex="-1" value={value}>
      <label className="mat-radio-label" htmlFor={`${id}-input`}>
        <div className="mat-radio-container">
          <div className="mat-radio-outer-circle"></div>
          <div className="mat-radio-inner-circle"></div>
          <div className="mat-radio-ripple mat-ripple">
            <div className="mat-ripple-element mat-radio-persistent-ripple"></div>
          </div>
          <input
            className="mat-radio-input cdk-visually-hidden"
            type="radio"
            id={`${id}-input`}
            name={group?.name}
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={() => group?.onChange?.(value)}
          />
        </div>
        <div className="mat-radio-label-content">
          <span style={{ display: 'none' }}>{' '}</span>
          {children}
        </div>
      </label>
    </mat-radio-button>
  );
}
