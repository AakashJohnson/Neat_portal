'use client';
// Route "admin/courses" → AdminCoursesOfferedComponent: all products (or one
// company's, or a course/company search) with Approve / Pause / Delete
// (changeProductStatus → toast + reload).
import { useState } from 'react';
import Scope from '@/components/common/Scope';
import { toastr } from '@/components/common/Toastr';
import { DashboardCard, PageHeader } from '@/components/admin/AdminParts';
import { MatOption, MatSelect } from '@/components/mat/MatSelect';
import { adminService } from '@/services';
import { subscribe } from '@/lib/api';
import { fileUrl } from '@/lib/format';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function Page() {
  const [products, setProducts] = useState(undefined);
  const [companies, setCompanies] = useState(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [company, setCompany] = useState(undefined);

  const handleProducts = (data) => setProducts(data['products']);
  const getData = () => {
    subscribe(adminService.getCompanies(), (data) => setCompanies(data['companies']));
    subscribe(adminService.getAdminProducts(), handleProducts);
  };
  useNgOnInit(getData);

  const getCompanyWiseProduct = (name) => subscribe(adminService.getCompanyWiseProduct({ company_name: name }), handleProducts);
  const getCourseCompanyWiseProduct = (name) => subscribe(adminService.getCourseWiseProduct({ course_company_name: name }), handleProducts);
  const changeStatus = (status, code) =>
    subscribe(adminService.changeProductStatus({ status, code }), (data) => {
      if (data['message'] == 'Success') {
        toastr.success(data['reason']);
        getData();
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
              <input type="text" placeholder="Search Courses/ Company" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
              <button onClick={() => getCourseCompanyWiseProduct(searchQuery)} className="search-btn">
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
                  getCompanyWiseProduct(v);
                }}
              >
                {(companies ?? []).map((c, i) => (
                  <MatOption key={i} value={c?.name}>
                    {` ${c?.name ?? ''}`}
                  </MatOption>
                ))}
              </MatSelect>
            </div>
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
