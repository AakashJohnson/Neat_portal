import { Children, isValidElement } from 'react';

const cls = (extra, own) => `${extra ?? ''} ${own}`.trim();

export function MatCard({ className, children, ...rest }) {
  return (
    <mat-card class={cls(className, 'mat-card')} {...rest}>
      {children}
    </mat-card>
  );
}

export function MatCardTitle({ className, children, ...rest }) {
  return (
    <mat-card-title class={cls(className, 'mat-card-title')} {...rest}>
      {children}
    </mat-card-title>
  );
}

export function MatCardContent({ className, children, ...rest }) {
  return (
    <mat-card-content class={cls(className, 'mat-card-content')} {...rest}>
      {children}
    </mat-card-content>
  );
}

export function MatCardHeader({ className, children, ...rest }) {
  const all = Children.toArray(children);
  const titles = all.filter((c) => isValidElement(c) && c.type === MatCardTitle);
  const others = all.filter((c) => !titles.includes(c));
  return (
    <mat-card-header class={cls(className, 'mat-card-header')} {...rest}>
      <div className="mat-card-header-text">{titles}</div>
      {others}
    </mat-card-header>
  );
}
