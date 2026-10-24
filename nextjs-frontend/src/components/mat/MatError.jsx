'use client';
// <mat-error> (Angular Material 7.3) outside or inside a form field:
// <mat-error class="mat-error" role="alert" id="mat-error-N">.
import { useId } from 'react';

export function MatError({ className = '', children, ...rest }) {
  const id = `mat-error-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <mat-error class={`mat-error ${className}`.trim()} role="alert" id={id} {...rest}>
      {children}
    </mat-error>
  );
}

export default MatError;
