'use client';
// Route "admin/registered-institute" → AdminRegisteredInstituteComponent.
import Scope from '@/components/common/Scope';
import { DashboardCard, PageHeader, SearchField, pad, useAdminTable } from '@/components/admin/AdminParts';
import { MatPaginator, MatTable } from '@/components/mat/MatTable';
import { adminService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

const COLUMNS = [
  { id: 'institute_name', header: ' Name of Institutes ', cell: (row) => pad(row.institute_name) },
  { id: 'institute_mobile', header: ' Phone Number ', cell: (row) => pad(row.institute_mobile) },
  { id: 'institute_email', header: 'Valid Email ', cell: (row) => pad(row.institute_email) },
  { id: 'status', header: 'Status', cell: (row) => pad(row.status) },
].map((c) => ({ ...c, headerClass: 'headerBG', cellClass: 'tableData' }));

export default function Page() {
  const { ds, applyFilter } = useAdminTable();

  useNgOnInit(() => {
    subscribe(adminService.getInstitutes(), (data) => {
      console.log(data);
      ds.setData(data['institutes'] ?? []);
    });
  });

  return (
    <Scope name="admin-registered-institute">
      <div>
        <PageHeader title="Registered Institutes" />
        <DashboardCard title="Registered Institutes">
          <div className="table-responsive">
            <SearchField onKeyUp={applyFilter} />
            <div>
              <MatTable dataSource={ds} columns={COLUMNS} className="table table-bordered course-details-checkout" />
              {ds.data.length === 0 && (
                <div>
                  <p className="no-records-found"> No Records Found! </p>
                </div>
              )}
              <MatPaginator dataSource={ds} />
            </div>
          </div>
        </DashboardCard>
      </div>
    </Scope>
  );
}
