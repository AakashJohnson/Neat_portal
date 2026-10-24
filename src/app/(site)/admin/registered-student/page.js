'use client';
// Route "admin/registered-student" → AdminRegisteredStudentComponent.
import Scope from '@/components/common/Scope';
import ServerPagedList from '@/components/admin/ServerPagedList';
import { pad } from '@/components/admin/AdminParts';
import { adminService } from '@/services';

const COLUMNS = [
  ['name_of_learner', ' Name of Beneficiary ', 'username'],
  ['mobile_number', ' Valid Mobile Number ', 'phone'],
  ['email', ' Valid Email ', 'email'],
  ['status', ' Status ', 'status'],
].map(([id, header, field]) => ({ id, header, cell: (row) => pad(row[field]), headerClass: 'headerBG', cellClass: 'tableData' }));

export default function Page() {
  return (
    <Scope name="admin-registered-student">
      <ServerPagedList
        title="Registered UG Student"
        listKey="students"
        fetchPage={adminService.getStudents}
        columns={COLUMNS}
        placeholder="Name, Email or Mobile"
        loadingText="Loading students..."
        errorLabel="Student"
      />
    </Scope>
  );
}
