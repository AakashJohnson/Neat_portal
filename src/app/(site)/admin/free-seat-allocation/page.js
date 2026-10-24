'use client';
// Route "admin/free-seat-allocation" → FreeSeatAllocationComponent: products
// for allocation ({code} from a route param the route does not have, so
// undefined) with "Allocate" (allocateseat — a missing Laravel method, R-03:
// the table is not refreshed).
import Scope from '@/components/common/Scope';
import { SearchField, pad, useAdminTable } from '@/components/admin/AdminParts';
import { MatPaginator, MatTable } from '@/components/mat/MatTable';
import { adminService, courseService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function Page() {
  const { ds, applyFilter } = useAdminTable();

  const getProductsForAllocation = () => subscribe(courseService.getProductsForAllocation({ code: undefined }), (data) => ds.setData(data['products'] ?? []));
  const allocate = (code, availableFreeCourses, course_name, stream) =>
    subscribe(adminService.allocateseat({ course_id: code, collage_freeseat: availableFreeCourses, course_name, stream_name: stream }), () => getProductsForAllocation());

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
        <a onClick={() => allocate(row.code, row.availableFreeCourses, row.course_name, row.stream)} className="org-button">
          Allocate
        </a>
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
