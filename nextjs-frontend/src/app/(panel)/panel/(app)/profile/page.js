'use client';

import UserEditor from '@/components/panel/UserEditor';
import { Crumb, PanelPage } from '@/components/panel/ui';

export default function PanelProfilePage() {
  return (
    <PanelPage title="My Profile" heading="My Profile" breadcrumbs={<Crumb active>My Profile</Crumb>}>
      <UserEditor />
    </PanelPage>
  );
}
