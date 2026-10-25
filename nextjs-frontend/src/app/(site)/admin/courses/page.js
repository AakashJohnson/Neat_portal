'use client';
// Route "admin/courses" → AdminCoursesOfferedComponent: all products (or one
// company's, or a course/company search) with Approve / Pause / Delete
// (changeProductStatus → toast + reload).
import { useCallback, useState } from 'react';
import Scope from '@/components/common/Scope';
import { toastr } from '@/components/common/Toastr';
import { DashboardCard, PageHeader } from '@/components/admin/AdminParts';
import { MatOption, MatSelect } from '@/components/mat/MatSelect';
import { adminService } from '@/services';
import { subscribe } from '@/lib/api';
import { fileUrl } from '@/lib/format';
import { filterProducts, searchCollection, useAsyncSearch } from '@/lib/liveSearch';
import SearchStatus from '@/components/common/SearchStatus';

export default function Page() {
  const [searchQuery, setSearchQuery] = useState('');
  const [company, setCompany] = useState(undefined);

  const loadProducts = useCallback(async () => searchCollection(await (company ? adminService.getCompanyWiseProduct({ company_name: company }) : adminService.getAdminProducts()), 'products'), [company]);
  const loadCompanies = useCallback(async () => searchCollection(await adminService.getCompanies(), 'companies'), []);
  const result = useAsyncSearch(loadProducts, { delay: 0 });
  const companyResult = useAsyncSearch(loadCompanies, { delay: 0 });
  const companies = companyResult.data ?? [];
  const products = filterProducts(result.data ?? [], searchQuery);
  const changeStatus = (status, code) =>
    subscribe(adminService.changeProductStatus({ status, code }), (data) => {
      if (data['message'] == 'Success') {
        toastr.success(data['reason']);
        result.refresh();
      }
    });

  return (
    <Scope name="admin-courses-offered">
      <div>
        <PageHeader title="Products Offered" />
        <DashboardCard
          title="Products Offered"
          headerClass="card-header bg-head d-flex align-items-center justify-content-between"
          headerExtra={
            <div className="search-form-container">
              <input type="search" aria-label="Search Courses/ Company" placeholder="Search Courses/ Company" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
              <button type="button" onClick={result.refresh} className="search-btn">
                <i className="fa fa-search" aria-hidden="true"></i> Search
              </button>
            </div>
          }
        >
          <div className="row">
            <div className="col-xl-12 col-sm-12 mb-3">
              <MatSelect
                name="company"
                className="form-control mb-3"
                placeholder="Select Company"
                value={company}
                onChange={(v) => {
                  setCompany(v);
                }}
              >
                {(companies ?? []).map((c, i) => (
                  <MatOption key={i} value={c?.name}>
                    {` ${c?.name ?? ''}`}
                  </MatOption>
                ))}
              </MatSelect>
            </div>
            <SearchStatus loading={result.loading} error={result.error || companyResult.error} empty={products.length === 0} />
            {(products ?? []).map((product, i) => (
              <div key={i} className="col-xl-3 col-sm-6 mb-3">
                <a>
                  <div className="card">
                    <div className="card-header aligncenter">
                      <img src={fileUrl(`files/course_logo/${product?.course_logo_file ?? ''}`)} />
                    </div>
                    <div className="card-body aligncenter">
                      <h3 className="h4">{product?.course_name}</h3>
                      <a onClick={() => changeStatus('Approved', product?.code)} className="approve-green">
                        <i className="fa fa-check" aria-hidden="true"></i> Approve
                      </a>
                      <a onClick={() => changeStatus('Paused', product?.code)} className="pause-yellow">
                        <i className="fa fa-pause"></i> Pause
                      </a>
                      <a onClick={() => changeStatus('Deleted', product?.code)} className="delete-red">
                        <i className="fa fa-trash" aria-hidden="true"></i> Delete
                      </a>
                    </div>
                    <div className="line2"></div>
                    <div className="card-body">
                      <h3 className="h4">Current Status - {product?.product_active}</h3>
                      <p className="approve-p">Paid Student 75</p>
                      <p className="approve-p">Free Student 25</p>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </Scope>
  );
}
