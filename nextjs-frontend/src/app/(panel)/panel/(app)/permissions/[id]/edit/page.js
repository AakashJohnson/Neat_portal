'use client';
// permissions/{id}/edit.
import { useParams } from 'next/navigation';
import RolePermissionForm from '@/components/panel/RolePermissionForm';

export default function Page() {
  const { id } = useParams();
  return <RolePermissionForm kind="permission" id={id} />;
}
