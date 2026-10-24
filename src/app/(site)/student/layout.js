'use client';
// StudentComponent shell: <app-navbar> <router-outlet> <app-footer>. Its
// constructor requests getStates() (result only used by an unrendered form);
// the role check (role_id 3, else logout) is enforced by proxy.js.
import SiteChrome from '@/components/layout/SiteChrome';
import { studentService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function StudentLayout({ children }) {
  useNgOnInit(() => {
    subscribe(studentService.getStates(), () => {});
  });
  return <SiteChrome>{children}</SiteChrome>;
}
