'use client';


import { useId, useLayoutEffect, useRef, useState } from 'react';

const FLOATING_LABEL_SCALE = 0.75;
const OUTLINE_GAP_PADDING = 5;

export default function MatFormField({ appearance = 'legacy', label, controlType = 'mat-input', empty = true, panelOpen = false, disabled = false, invalid = false, className = '', suffix, children, ...rest }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const controlId = `mat-input-${uid}`;
  const labelId = `mat-form-field-label-${uid}`;
  const [focused, setFocused] = useState(false);
  const flexRef = useRef(null);
  const labelRef = useRef(null);
  const [gap, setGap] = useState(null);

  const hasLabel = !!label;
  // MatInput.shouldLabelFloat = focused || !empty; MatSelect: panelOpen || !empty
  const shouldFloat = controlType === 'mat-select' ? panelOpen || !empty : focused || !empty;
  const hideControlPlaceholder = (appearance === 'legacy' && !hasLabel) || (hasLabel && !shouldFloat);

  useLayoutEffect(() => {
    if (appearance !== 'outline' || !labelRef.current?.children.length || !labelRef.current.textContent.trim()) return;
    const container = flexRef.current.getBoundingClientRect();
    if (container.width === 0 && container.height === 0) return;
    const labelStart = labelRef.current.children[0].getBoundingClientRect().left;
    let labelWidth = 0;
    for (const child of labelRef.current.children) labelWidth += child.offsetWidth;
    const next = { start: labelStart - container.left - OUTLINE_GAP_PADDING, gap: labelWidth > 0 ? labelWidth * FLOATING_LABEL_SCALE + OUTLINE_GAP_PADDING * 2 : 0 };
    setGap((g) => (g && g.start === next.start && g.gap === next.gap ? g : next));
  }, [appearance, label]);

  const classes = [
    className,
    'mat-form-field',
    'mat-primary',
    `mat-form-field-type-${controlType}`,
    `mat-form-field-appearance-${appearance}`,
    'mat-form-field-can-float',
    hasLabel && 'mat-form-field-has-label',
    hideControlPlaceholder && 'mat-form-field-hide-placeholder',
    shouldFloat && 'mat-form-field-should-float',
    focused && 'mat-focused',
    disabled && 'mat-form-field-disabled',
    invalid && 'mat-form-field-invalid',
  ]
    .filter(Boolean)
    .join(' ');

  const outline = (thick) => (
    <div className={`mat-form-field-outline${thick ? ' mat-form-field-outline-thick' : ''}`}>
      <div className="mat-form-field-outline-start" style={gap ? { width: `${gap.start}px` } : undefined}></div>
      <div className="mat-form-field-outline-gap" style={gap ? { width: `${gap.gap}px` } : undefined}></div>
      <div className="mat-form-field-outline-end"></div>
    </div>
  );

  return (
    <mat-form-field class={classes} appearance={appearance === 'legacy' ? undefined : appearance} {...rest}>
      <div className="mat-form-field-wrapper">
        <div ref={flexRef} className="mat-form-field-flex" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
          {appearance === 'outline' && (
            <>
              {outline(false)}
              {outline(true)}
            </>
          )}
          <div className="mat-form-field-infix">
            {typeof children === 'function' ? children(controlId) : children}
            <span className="mat-form-field-label-wrapper">
              {hasLabel && (
                <label
                  ref={labelRef}
                  className={['mat-form-field-label', empty && 'mat-empty', empty && 'mat-form-field-empty'].filter(Boolean).join(' ')}
                  id={labelId}
                  htmlFor={controlId}
                  aria-owns={controlId}
                >
                  <mat-label>{label}</mat-label>
                </label>
              )}
            </span>
          </div>
          {suffix && <div className="mat-form-field-suffix">{suffix}</div>}
        </div>
        {appearance === 'legacy' && (
          <div className="mat-form-field-underline">
            <span className="mat-form-field-ripple"></span>
          </div>
        )}
        <div className="mat-form-field-subscript-wrapper">
          <div className="mat-form-field-hint-wrapper" style={{ opacity: 1, transform: 'translateY(0%)' }}>
            <div className="mat-form-field-hint-spacer"></div>
          </div>
        </div>
      </div>
    </mat-form-field>
  );
}
