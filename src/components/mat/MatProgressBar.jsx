'use client';
// Port of Angular Material 7.3.7 <mat-progress-bar mode="determinate" [value]>:
// host attributes, the dotted buffer pattern (fill="url(<current path>#id)")
// and the primary bar scaled to value / 100.
import { usePathname } from 'next/navigation';
import { useState } from 'react';

let progressbarId = 0;

export default function MatProgressBar({ value = 0 }) {
  const path = usePathname();
  const [id] = useState(() => `mat-progress-bar-${progressbarId++}`);
  const clamped = Math.min(Math.max(Number(value) || 0, 0), 100);
  return (
    <mat-progress-bar class="mat-progress-bar mat-primary" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={String(clamped)} mode="determinate">
      <svg width="100%" height="4" focusable="false" className="mat-progress-bar-background mat-progress-bar-element">
        <defs>
          <pattern id={id} x="4" y="0" width="8" height="4" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="2"></circle>
          </pattern>
        </defs>
        <rect fill={`url('${path}#${id}')`} width="100%" height="100%"></rect>
      </svg>
      <div className="mat-progress-bar-buffer mat-progress-bar-element"></div>
      <div className="mat-progress-bar-primary mat-progress-bar-fill mat-progress-bar-element" style={{ transform: `scaleX(${clamped / 100})` }}></div>
      <div className="mat-progress-bar-secondary mat-progress-bar-fill mat-progress-bar-element"></div>
    </mat-progress-bar>
  );
}
