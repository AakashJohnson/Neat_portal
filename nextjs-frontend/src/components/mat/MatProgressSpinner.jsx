'use client';


import { useInsertionEffect } from 'react';

const BASE_SIZE = 100;
const BASE_STROKE_WIDTH = 10;
const diameters = new Set([BASE_SIZE]);
let styleTag = null;

const animationText = (diameter, circumference) => `
 @keyframes mat-progress-spinner-stroke-rotate-${diameter} {
    0%      { stroke-dashoffset: ${0.95 * circumference};  transform: rotate(0); }
    12.5%   { stroke-dashoffset: ${0.2 * circumference};    transform: rotate(0); }
    12.5001%  { stroke-dashoffset: ${0.2 * circumference};    transform: rotateX(180deg) rotate(72.5deg); }
    25%     { stroke-dashoffset: ${0.95 * circumference};  transform: rotateX(180deg) rotate(72.5deg); }

    25.0001%   { stroke-dashoffset: ${0.95 * circumference};  transform: rotate(270deg); }
    37.5%   { stroke-dashoffset: ${0.2 * circumference};    transform: rotate(270deg); }
    37.5001%  { stroke-dashoffset: ${0.2 * circumference};    transform: rotateX(180deg) rotate(161.5deg); }
    50%     { stroke-dashoffset: ${0.95 * circumference};  transform: rotateX(180deg) rotate(161.5deg); }

    50.0001%  { stroke-dashoffset: ${0.95 * circumference};  transform: rotate(180deg); }
    62.5%   { stroke-dashoffset: ${0.2 * circumference};    transform: rotate(180deg); }
    62.5001%  { stroke-dashoffset: ${0.2 * circumference};    transform: rotateX(180deg) rotate(251.5deg); }
    75%     { stroke-dashoffset: ${0.95 * circumference};  transform: rotateX(180deg) rotate(251.5deg); }

    75.0001%  { stroke-dashoffset: ${0.95 * circumference};  transform: rotate(90deg); }
    87.5%   { stroke-dashoffset: ${0.2 * circumference};    transform: rotate(90deg); }
    87.5001%  { stroke-dashoffset: ${0.2 * circumference};    transform: rotateX(180deg) rotate(341.5deg); }
    100%    { stroke-dashoffset: ${0.95 * circumference};  transform: rotateX(180deg) rotate(341.5deg); }
  }
`;

/** @param {{ diameter?: number|string, spinner?: boolean, style?: object }} props  spinner: render <mat-spinner> */
export default function MatProgressSpinner({ diameter: diameterInput = BASE_SIZE, spinner = false, style }) {
  const diameter = Number(diameterInput);
  const strokeWidth = diameter / 10;
  const radius = (diameter - BASE_STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const viewBox = radius * 2 + strokeWidth;

  useInsertionEffect(() => {
    if (diameters.has(diameter)) return;
    if (!styleTag) {
      styleTag = document.createElement('style');
      document.head.appendChild(styleTag);
    }
    styleTag.sheet?.insertRule(animationText(diameter, circumference), 0);
    diameters.add(diameter);
  }, [diameter, circumference]);

  const Tag = spinner ? 'mat-spinner' : 'mat-progress-spinner';
  return (
    <Tag
      role="progressbar"
      class={`${spinner ? 'mat-spinner ' : ''}mat-progress-spinner mat-primary mat-progress-spinner-indeterminate-animation`}
      style={{ ...style, width: `${diameter}px`, height: `${diameter}px` }}
      aria-valuenow="0"
      mode="indeterminate"
      diameter={spinner && diameterInput !== BASE_SIZE ? String(diameterInput) : undefined}
    >
      <svg style={{ width: `${diameter}px`, height: `${diameter}px` }} viewBox={`0 0 ${viewBox} ${viewBox}`} preserveAspectRatio="xMidYMid meet" focusable="false">
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          style={{ animationName: `mat-progress-spinner-stroke-rotate-${diameter}`, strokeDasharray: `${circumference}px`, strokeWidth: `${(strokeWidth / diameter) * 100}%` }}
        />
      </svg>
    </Tag>
  );
}
