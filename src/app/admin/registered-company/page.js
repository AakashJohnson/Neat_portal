'use client';
// Route "admin/registered-company" → AdminRegisteredCompanyComponent: the eye
// icon opens admin/company-preview/:neat_id.
import { useRouter } from 'next/navigation';
import Scope from '@/components/common/Scope';
import { DashboardCard, PageHeader, SearchField, pad, useAdminTable } from '@/components/admin/AdminParts';
import MatIcon from '@/components/mat/MatIcon';
import { MatPaginator, MatTable } from '@/components/mat/MatTable';
import { adminService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function Page() {
  const router = useRouter();
  const { ds, applyFilter } = useAdminTable();
  const columns = [
    { id: 'name', header: ' Company Name ', cell: (row) => pad(row.name) },
    { id: 'address_india', header: 'Company Address ', cell: (row) => pad(row.address_india) },
    { id: 'product_count', header: 'Total Products', cell: (row) => pad(row.product_count) },
    { id: 'action', header: 'View Details ', cell: (row) => <MatIcon onClick={() => router.push('/admin/company-preview/' + row.neat_id)}>remove_red_eye </MatIcon> },
  ].map((c) => ({ ...c, headerClass: 'headerBG', cellClass: 'tableData' }));

  useNgOnInit(() => {
    subscribe(adminService.getCompanies(), (data) => ds.setData(data['companies'] ?? []));
  });

  return (
    <Scope name="admin-registered-company">
      <div>
        <PageHeader title="Registered Company" />
        <DashboardCard title="Registered Company">
          <div className="table-responsive">
            <SearchField onKeyUp={applyFilter} />
            <MatTable dataSource={ds} columns={columns} className="table table-bordered course-details-checkout" />
            {ds.data.length === 0 && (
              <div>
                <p className="no-records-found"> No Records Found! </p>
              </div>
            )}
            <MatPaginator dataSource={ds} />
          </div>
        </DashboardCard>
      </div>
    </Scope>
  );
}
