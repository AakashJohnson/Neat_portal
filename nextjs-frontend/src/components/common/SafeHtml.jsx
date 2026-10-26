'use client';


import { useMemo, useSyncExternalStore } from 'react';
import { sanitize } from '@/lib/format';

const noopSubscribe = () => () => {};

export default function SafeHtml({ html, as: Tag = 'span', ...rest }) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const clean = useMemo(() => (isClient ? sanitize(html) : ''), [isClient, html]);
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: clean }} />;
}
