'use client';
// Port of company-form/course-form-preview: the submitted product details with
// "Edit details" (editProductDetails → 'Edit your details!' → the parent form
// reloads). The link keeps data-toggle="modal" to a missing #BookyourSeat, so
// Bootstrap only prevents the "#" navigation.
import { useParams } from 'next/navigation';
import { useState } from 'react';
import SafeHtml from '@/components/common/SafeHtml';
import { toastr } from '@/components/common/Toastr';
import { dataToggleModal } from '@/components/bootstrap/bsModal';
import { companyService, courseService } from '@/services';
import { subscribe } from '@/lib/api';
import { fileUrl } from '@/lib/format';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function CourseFormPreview({ onMessage }) {
  const { id: productCode } = useParams();
  const [products, setProducts] = useState(undefined);

  useNgOnInit(() => {
    subscribe(courseService.getProductDetails({ code: productCode }), (data) => setProducts(data['products']));
  });

  const editDetails = () => {
    subscribe(companyService.editProductDetails({ code: productCode }), (data) => {
      if (data['message'] == 'Success') {
        toastr.success('Edit your details!');
        onMessage?.(true);
      }
    });
  };

  return (
    <div className="contact-form-area section-padding">
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="section-title-wrapper">
              <div className="section-title">
                <h3 style={{ marginTop: '40px' }}>{products?.course_name}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-bordered course-details-checkout">
            <thead className="thead-light">
              <tr>
                <th scope="col">Course Image</th>
                <th scope="col">Course Name</th>
                <th scope="col">Course Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <img src={fileUrl(`files/course_logo/${products?.course_logo_file ?? ''}`)} alt="courseLogo" />
                </th>
                <td>{products?.course_name}</td>
                <td>₹ {products?.price}</td>
              </tr>
            </tbody>
          </table>
          <table className="table table-bordered course-details-checkout">
            <thead className="thead-light light-head">
              <tr>
                <th width="100%" scope="col">
                  Short Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <SafeHtml as="p" html={products?.short_description} />
                </th>
              </tr>
            </tbody>
          </table>
          <table className="table table-bordered course-details-checkout">
            <thead className="thead-light light-head">
              <tr>
                <th width="21%" scope="col">
                  Requirements Heading
                </th>
                <th width="79%" scope="col">
                  Requirements Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{products?.requirements_heading}</th>
                <td>
                  <SafeHtml as="p" html={products?.requirements_description} />
                </td>
              </tr>
            </tbody>
          </table>
          <table className="table table-bordered course-details-checkout">
            <thead className="thead-light light-head">
              <tr>
                <th width="21%" scope="col">
                  Description Heading
                </th>
                <th width="79%" scope="col">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{products?.description_heading}</th>
                <td>
                  <SafeHtml as="p" html={products?.description} />
                </td>
              </tr>
            </tbody>
            <tbody>
              <tr>
                <th colSpan="2" scope="row" className="aligncenter">
                  <a
                    href="#"
                    data-toggle="modal"
                    data-target="#BookyourSeat"
                    className="org-button"
                    onClick={(e) => {
                      editDetails();
                      dataToggleModal(e, '#BookyourSeat');
                    }}
                  >
                    Edit details
                  </a>
                </th>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
