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
