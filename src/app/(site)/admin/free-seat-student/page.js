'use client';
// Route "admin/free-seat-student" → AdminFreeSeatAllocattedComponent.
import { DashboardCard, PageHeader, SearchField, pad, useAdminTable } from '@/components/admin/AdminParts';
import { MatPaginator, MatTable } from '@/components/mat/MatTable';
import { adminService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

const COLUMNS = [
  { id: 'name', header: ' Student Name ', cell: (row) => pad(row.name) },
  { id: 'phone', header: 'Phone', cell: (row) => pad(row.mobile) },
  { id: 'email', header: 'Email', cell: (row) => pad(row.email) },
  { id: 'gender', header: 'Gender', cell: (row) => pad(row.gender) },
].map((c) => ({ ...c, headerClass: 'headerBG', cellClass: 'tableData' }));

export default function Page() {
  const { ds, applyFilter } = useAdminTable();

  useNgOnInit(() => {
    subscribe(adminService.getFreeSeatStudent(), (data) => ds.setData(data['studentLists'] ?? []));
  });

  return (
    <div>
      <PageHeader title="Registered Free Seat" crumb="Registered Free Seat Student" />
      <DashboardCard title="Registered Free Seat Student">
        <div className="table-responsive">
          <SearchField onKeyUp={applyFilter} />
          <MatTable dataSource={ds} columns={COLUMNS} className="table table-bordered course-details-checkout" />
          {ds.data.length === 0 && (
            <div>
              <p className="no-records-found"> No Records Found! </p>
            </div>
          )}
          <MatPaginator dataSource={ds} />
        </div>
      </DashboardCard>
    </div>
  );
}
