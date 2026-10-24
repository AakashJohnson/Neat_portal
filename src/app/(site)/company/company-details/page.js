'use client';
// Route "company/company-details" → CompanyDetailsComponent: productList()
// (GET product-list) rows as [name, free, paid]. The Laravel route points to a
// missing CompanyController method (R-03), so the table stays empty.
import { useState } from 'react';
import { companyService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function CompanyDetailsPage() {
  const [dataSource, setDataSource] = useState(undefined);

  useNgOnInit(() => {
    subscribe(companyService.productList(), (data) => setDataSource(data['products']));
  });

  return (
    <div className="contact-form-area section-padding">
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="section-title-wrapper">
              <div className="section-title">
                <h3 style={{ marginTop: '40px' }}>Company Details</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-bordered course-details-checkout">
            <thead className="thead-light">
              <tr>
                <th scope="col">Product Name</th>
                <th scope="col">No. of Paid Students</th>
                <th scope="col">No. of Free Students</th>
                <th scope="col">Certificates Issue</th>
                <th scope="col">No. of Students Appeared</th>
                <th scope="col">No. of Students Pass</th>
                <th scope="col">No. of Students Fail</th>
                <th scope="col">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {(dataSource ?? []).map((product, i) => (
                <tr key={i}>
                  <th scope="row">{product[0]}</th>
                  <td>{product[2]}</td>
                  <td>{product[1]}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
