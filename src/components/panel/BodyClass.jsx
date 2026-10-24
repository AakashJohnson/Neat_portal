'use client';
// <body class="…"> of a Blade layout.
import { useEffect } from 'react';

export default function BodyClass({ name }) {
  useEffect(() => {
    document.body.classList.add(name);
    return () => document.body.classList.remove(name);
  }, [name]);
  return null;
}
