// Port of Angular Material 7.3.7 <mat-progress-spinner mode="indeterminate">
// with the default diameter (100): host classes/attributes and the SVG circle
// as MatProgressSpinner renders them. The stroke-rotate-100 keyframes ship in
// the component styles (public/legacy/material.css), so no style node is added.
const DIAMETER = 100;
const STROKE_WIDTH = DIAMETER / 10;
const RADIUS = (DIAMETER - 10) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function MatProgressSpinner() {
  return (
    <mat-progress-spinner
      role="progressbar"
      class="mat-progress-spinner mat-primary mat-progress-spinner-indeterminate-animation"
      style={{ width: `${DIAMETER}px`, height: `${DIAMETER}px` }}
      aria-valuenow="0"
      mode="indeterminate"
    >
      <svg style={{ width: `${DIAMETER}px`, height: `${DIAMETER}px` }} viewBox={`0 0 ${RADIUS * 2 + STROKE_WIDTH} ${RADIUS * 2 + STROKE_WIDTH}`} preserveAspectRatio="xMidYMid meet" focusable="false">
        <circle
          cx="50%"
          cy="50%"
          r={RADIUS}
          style={{ animationName: `mat-progress-spinner-stroke-rotate-${DIAMETER}`, strokeDasharray: `${CIRCUMFERENCE}px`, strokeWidth: `${(STROKE_WIDTH / DIAMETER) * 100}%` }}
        />
      </svg>
    </mat-progress-spinner>
  );
}
