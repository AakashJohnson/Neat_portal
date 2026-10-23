'use client';
// Equivalent of Angular's sanitised [innerHTML] binding. HTML is sanitised with
// DOMPurify in the browser only; the server and the hydration pass render it
// empty, so server and client markup match.
import { useMemo, useSyncExternalStore } from 'react';
import { sanitize } from '@/lib/format';

const noopSubscribe = () => () => {};

export default function SafeHtml({ html, as: Tag = 'span', ...rest }) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const clean = useMemo(() => (isClient ? sanitize(html) : ''), [isClient, html]);
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: clean }} />;
}
