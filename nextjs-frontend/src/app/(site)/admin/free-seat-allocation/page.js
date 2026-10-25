'use client';
// Route "admin/free-seat-allocation" → FreeSeatAllocationComponent: products
// for allocation. The API uses current stock and the product's configured streams.
import { useState } from 'react';
import Scope from '@/components/common/Scope';
import { SearchField, pad, useAdminTable } from '@/components/admin/AdminParts';
import { MatPaginator, MatTable } from '@/components/mat/MatTable';
import { adminService, courseService } from '@/services';
import { apiErrorMessage, subscribe } from '@/lib/api';
import { toastr } from '@/components/common/Toastr';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function Page() {
  const { ds, applyFilter } = useAdminTable();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const failure = res => {
    const message = apiErrorMessage(res);
    setNotice(message);
    toastr.error(message);
  };

  const getProductsForAllocation = () => subscribe(courseService.getProductsForAllocation({}), (data) => ds.setData(data['products'] ?? []), failure);
  const allocate = async (code, availableFreeCourses, course_name) => {
    if (busy || !window.confirm(`Allocate up to ${availableFreeCourses} available free seats for ${course_name}?`)) return;
    setBusy(true);
    await subscribe(adminService.allocateseat({ course_id: code }), data => {
      const failed = data.email_delivery.failed + data.email_delivery.captured;
      const message = `${data.reason}${failed ? ` ${failed} notification email(s) were not delivered.` : ''}`;
      setNotice(message);
      if (failed) toastr.warning(message);
      else toastr.success(message);
      getProductsForAllocation();
    }, failure);
    setBusy(false);
  };

  useNgOnInit(getProductsForAllocation);

  const columns = [
    { id: 'company_name', header: ' Company Name ', cell: (row) => pad(row.company_name) },
    { id: 'course_name', header: 'Product Name ', cell: (row) => pad(row.course_name) },
    { id: 'code', header: 'Product Id ', cell: (row) => pad(row.code) },
    { id: 'availableFreeCourses', header: 'Available Free Seats ', cell: (row) => pad(row.availableFreeCourses) },
    { id: 'stream', header: 'Stream ', cell: (row) => pad(row.stream) },
    {
      id: 'action',
      header: ' Allocate ',
      cell: (row) => (
        <button type="button" disabled={busy || Number(row.availableFreeCourses) <= 0} onClick={() => allocate(row.code, row.availableFreeCourses, row.course_name)} className="org-button">
          Allocate
        </button>
      ),
    },
  ].map((c) => ({ ...c, headerClass: 'headerBG', cellClass: 'tableData' }));

  return (
    <Scope name="free-seat-allocation">
      <section className="dashboard-box no-padding-bottom">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-header bg-head d-flex align-items-center">
                  <h3 className="h4">Registered Company</h3>
                </div>
                <div className="card-body">
                  {notice && <p role="status">{notice}</p>}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Scope>
  );
}
