'use client';
// user/edit.blade.php (users.manage).
import { useParams } from 'next/navigation';
import { useState } from 'react';
import UserEditor from '@/components/panel/UserEditor';
import { nameOrEmail } from '@/components/panel/PanelProvider';
import { Crumb, PanelPage } from '@/components/panel/ui';

export default function PanelUserEditPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const name = user ? nameOrEmail(user) : '';
  return (
    <PanelPage
      title="Edit User"
      heading={name}
      breadcrumbs={
        <>
          <Crumb href="/panel/users">Users</Crumb>
          <Crumb href={`/panel/users/${id}`}>{name}</Crumb>
          <Crumb active>Edit</Crumb>
        </>
      }
    >
      <UserEditor userId={id} onLoaded={setUser} />
    </PanelPage>
  );
}
