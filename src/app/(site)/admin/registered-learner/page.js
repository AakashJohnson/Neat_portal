'use client';
// Route "admin/registered-learner" → AdminRegisteredLearnerComponent.
import ServerPagedList from '@/components/admin/ServerPagedList';
import { pad } from '@/components/admin/AdminParts';
import { adminService } from '@/services';

const COLUMNS = [
  ['name', ' Learner Name ', 'username'],
  ['phone', ' Phone ', 'phone'],
  ['email', ' Email ', 'email'],
  ['profession', ' Profession ', 'profession'],
  ['status', ' Status ', 'status'],
].map(([id, header, field]) => ({ id, header, cell: (row) => pad(row[field]), headerClass: 'headerBG', cellClass: 'tableData' }));

export default function Page() {
  return (
    <ServerPagedList
      title="Registered Learner"
      listKey="learners"
      fetchPage={adminService.getLearners}
      columns={COLUMNS}
      placeholder="Name, Email, Phone or Profession"
      loadingText="Loading learners..."
      errorLabel="Learner"
    />
  );
}
