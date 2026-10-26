'use client';


export function getOverlayContainer() {
  let el = document.querySelector('body > .cdk-overlay-container');
  if (!el) {
    el = document.createElement('div');
    el.className = 'cdk-overlay-container';
    document.body.appendChild(el);
  }
  return el;
}

let overlayId = 0;
/** cdk-overlay-N ids, incremented per attached overlay like OverlayRef. */
export const nextOverlayId = () => `cdk-overlay-${overlayId++}`;
