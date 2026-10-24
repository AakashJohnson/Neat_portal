// AdminComponent shell (route "admin" and its children).
import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
