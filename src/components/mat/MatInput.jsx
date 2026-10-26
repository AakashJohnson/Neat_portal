'use client';


import { forwardRef, useId } from 'react';

const MatInput = forwardRef(function MatInput({ className = '', id, invalid = false, required = false, as: Tag = 'input', ...rest }, ref) {
  const uid = `mat-input-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Tag
      ref={ref}
      className={`${className} mat-input-element mat-form-field-autofill-control cdk-text-field-autofill-monitored`.trim()}
      id={id ?? uid}
      matinput=""
      required={required}
      aria-invalid={String(!!invalid)}
      aria-required={String(!!required)}
      {...rest}
    />
  );
});

export default MatInput;
