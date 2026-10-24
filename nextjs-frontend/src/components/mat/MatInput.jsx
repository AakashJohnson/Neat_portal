'use client';
// <input matInput> (Angular Material 7.3) outside a form field: the classes
// and attributes MatInput adds. material.css styles .mat-input-element
// (no border/background, inherited font), which overrides .form-control as
// in the Angular app.
//   <MatInput className="form-control" {...form.bind('x')} invalid={form.errorState('x')} required />
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
