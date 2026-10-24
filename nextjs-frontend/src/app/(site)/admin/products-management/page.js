'use client';
// Route "admin/products-management" → AdminProductsManagementComponent: the
// product-management statistics with a sticky header row.
import Scope from '@/components/common/Scope';
import { DashboardCard, PageHeader, SearchField, pad, useAdminTable } from '@/components/admin/AdminParts';
import { MatPaginator, MatTable } from '@/components/mat/MatTable';
import { adminService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

const COLUMNS = [
  ['course_name', ' Product Name '],
  ['code', ' Product Code '],
  ['number_of_free_student', ' No. of Free Students '],
  ['number_of_paid_application', ' No. of Paid Applications '],
  ['payment_failed', ' Payments Failed '],
  ['payment_pending', ' Payments Pending '],
  ['payment_success', ' Payments Successful '],
  ['view_counter', ' View Count '],
].map(([id, header]) => ({ id, header, cell: (row) => pad(row[id]), headerClass: 'headerBG', cellClass: 'tableData' }));

export default function Page() {
  const { ds, applyFilter } = useAdminTable();

  useNgOnInit(() => {
    subscribe(adminService.getProductList(), (data) => ds.setData(data['data'] ?? []));
  });

  return (
    <Scope name="admin-products-management">
      <div>
        <PageHeader title="Product Management Module" crumb=" Product Management Module " />
        <DashboardCard title="Product Management Module">
          <SearchField onKeyUp={applyFilter} />
          <div className="example-container">
            <MatTable dataSource={ds} columns={COLUMNS} stickyHeader className="table table-bordered course-details-checkout" />
            {ds.data.length === 0 && (
              <div style={{ textAlign: 'center' }}>
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
