// <mat-icon> (Angular Material 7.3, ligature icon with the Material Icons font):
// <mat-icon class="mat-icon notranslate material-icons mat-icon-no-color" role="img" aria-hidden="true">
import { forwardRef } from 'react';

const MatIcon = forwardRef(function MatIcon({ className = '', color, children, ...rest }, ref) {
  const classes = ['mat-icon', 'notranslate', 'material-icons', color ? `mat-${color}` : 'mat-icon-no-color', className].filter(Boolean).join(' ');
  return (
    <mat-icon ref={ref} class={classes} role="img" aria-hidden="true" {...rest}>
      {children}
    </mat-icon>
  );
});

export default MatIcon;
