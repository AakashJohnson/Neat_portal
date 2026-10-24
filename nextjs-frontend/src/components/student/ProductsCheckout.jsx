'use client';
// Shared port of paid-course-checkout / free-course-checkout (student) and
// learner-paid-course / learner-free-course (learner): identical templates;
// products listed by the user's application_number (decoded from the token).
import { useState } from 'react';
import { useSession } from '@/components/providers/SessionProvider';
import { studentService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function ProductsCheckout({ kind }) {
  const { claims, ready, legacyDecodable } = useSession();
  const [products, setProducts] = useState(undefined);

  useNgOnInit(() => {
    // token == null → nothing; an undecodable token threw in ngOnInit.
    if (!claims || !legacyDecodable) return;
    const data = { application_number: claims['application_number'] };
    const call = kind === 'paid' ? studentService.getPurchasedProducts : studentService.getFreeProducts;
    subscribe(call(data), (res) => setProducts(res['products']));
  }, ready);

  return (
    <>
      {/* Course Details Area Start */}
      <div className="course-details-area section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title">
                  <h3 style={{ marginTop: '40px' }}>{kind === 'paid' ? 'Paid' : 'Free'} Product Details</h3>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12">
              <table className="table table-bordered course-details-checkout">
                <thead className="thead-light">
                  <tr>
                    <th scope="col">Products Code</th>
                    <th scope="col">Products Name</th>
                    <th scope="col">Price</th>
                    <th width="11%" scope="col">
                      View Course
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(products) ? products : []).map((product, i) => (
                    <tr key={i}>
                      <td>{product?.code}</td>
                      <td>
                        <p>{product?.course_name}</p>
                      </td>
                      <td>
                        <p>{product?.price}</p>
                      </td>
                      <td>
                        {/* href="{{product?.product_direct_url}}": interpolation renders '' for null/undefined */}
                        <a href={product?.product_direct_url ?? ''} target="_blank" className="org-button">
                          View Course
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
