'use client';
// Port of app/components/pages/grievance/grievance.component.{html,ts}
// Company/product selects appear for "Product related" and become required then.
import SiteChrome from '@/components/layout/SiteChrome';
import { MatSelect, MatOption } from '@/components/mat/MatSelect';
import { MatError } from '@/components/mat/MatError';
import { useFormGroup, Validators } from '@/lib/forms';
import { useEffect, useState } from 'react';
import { adminService, grievanceService } from '@/services';
import { subscribe } from '@/lib/api';
import { emailValidator } from '@/lib/appValidators';
import { toastr } from '@/components/common/Toastr';


const charCode = (evt) => (evt.which ? evt.which : evt.keyCode);
const isNumberKey = (evt) => charCode(evt) >= 48 && charCode(evt) <= 57;
const isCharKey = (evt) => !(charCode(evt) >= 48 && charCode(evt) <= 57);
const isSpace = (evt) => charCode(evt) != 32;

export default function GrievancePage() {
  const form = useFormGroup({
    grievance_type: [null],
    company_name: [null],
    company_product_name: [null],
    name: [null, [Validators.required]],
    email: [null, [Validators.required, emailValidator]],
    mobile: [null, [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
    organization: [null, [Validators.required]],
    description: [null, [Validators.required]],
  });
  const [companies, setCompanies] = useState(undefined);
  const [products, setProducts] = useState(undefined);
  const [companyGrievanceSelected, setCompanyGrievanceSelected] = useState(undefined);

  useEffect(() => {
    let alive = true;
    subscribe(adminService.getCompanies(), (data) => {
      if (alive) setCompanies(data['companies']);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onSubmit = (values) => {
    if (form.valid) {
      subscribe(grievanceService.submitGrievance(values), (data) => {
        if (data['message'] == 'Success') toastr.success('Grievance raised successfully!');
        if (data['message'] == 'Error') toastr.error('Some error occured! Please try again later.');
      });
    } else {
      toastr.error('Invalid details');
    }
  };

  // selectionChange runs after the control value changed; the new value is passed in.
  const getSelectedRole = (grievanceType) => {
    if (grievanceType == 'Product related') {
      setCompanyGrievanceSelected(true);
      form.setValidators('company_name', [Validators.required]);
      form.setValidators('company_product_name', [Validators.required]);
    } else {
      setCompanyGrievanceSelected(false);
      form.setValidators('company_name', null);
      form.setValidators('company_product_name', null);
    }
  };

  const getCompanyWiseProduct = (name) => {
    subscribe(adminService.getCompanyWiseProduct({ company_name: name }), (data) => setProducts(data['products']));
  };

  return (
    <SiteChrome>
      <div className="about-page-area section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title">
                  <h3 style={{ marginTop: "40px" }}>
                    Grievance
                  </h3>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-6 col-md-12 col-12">
              <div className="feedback-bg">
                <form noValidate onSubmit={(e) => { e.preventDefault(); form.markSubmitted(); if ((onSubmit(form.value)) === false) e.preventDefault(); }}>
                  <div className="form-group">
                    <h1>
                      Submit your Grievance!
                    </h1>
                  </div>
                  <div className="form-group">
                    <MatSelect className="form-control" {...form.bindValue("grievance_type")} invalid={form.errorState("grievance_type")} onSelectionChange={(value) => { getSelectedRole(value); }} placeholder="Select Grievance Type">
                      <MatOption value="None">
                        None
                      </MatOption>
                      <MatOption value="Product related">
                        Product related
                      </MatOption>
                    </MatSelect>
                  </div>
                  {(companyGrievanceSelected) && (
                  <div className="form-group">
                    <MatSelect className="form-control" {...form.bindValue("company_name")} invalid={form.errorState("company_name")} placeholder="Select Company Name" onSelectionChange={(value) => { getCompanyWiseProduct(value); }}>
                      <MatOption>
                        None
                      </MatOption>
                      {(companies ?? []).map((company, i) => (
                        <MatOption key={i} value={company.name}>
                        {company.name}
                      </MatOption>
                      ))}
                    </MatSelect>
                  </div>
                  )}
                  {(companyGrievanceSelected) && (
                  <div className="form-group">
                    <MatSelect className="form-control" {...form.bindValue("company_product_name")} invalid={form.errorState("company_product_name")} placeholder="Select Product">
                      <MatOption>
                        None
                      </MatOption>
                      {(products ?? []).map((product, i) => (
                        <MatOption key={i} value={product.course_name}>
                        {product.course_name}
                      </MatOption>
                      ))}
                    </MatSelect>
                  </div>
                  )}
                  <div className="form-group">
                    {(form.hasError('name', 'required')) && (
                    <MatError style={{ color: "#f44336" }} className="ml-2">
                      {' '}Name is required{' '}
                    </MatError>
                    )}
                    <input type="text" className="form-control" id="full-name" placeholder="Full Name" {...form.bind("name")} onKeyPress={(e) => { if ((isCharKey(e)) === false) e.preventDefault(); }} />
                  </div>
                  <div className="form-group">
                    {(form.hasError('email', 'invalidEmail')) && (
                    <MatError className="ml-2" style={{ color: "#f44336" }}>
                      {' '}Invalid Email{' '}
                    </MatError>
                    )}
                    {(form.hasError('email', 'required')) && (
                    <MatError className="ml-2" style={{ color: "#f44336" }}>
                      {' '}Email is required{' '}
                    </MatError>
                    )}
                    <input type="email" className="form-control" id="email" placeholder="Your Email" {...form.bind("email")} onKeyPress={(e) => { if ((isSpace(e)) === false) e.preventDefault(); }} />
                  </div>
                  <div className="form-group">
                    {(form.hasError('mobile', 'required')) && (
                    <MatError className="ml-2" style={{ color: "#f44336" }}>
                      {' '}Mobile Number is required{' '}
                    </MatError>
                    )}
                    <input type="tel" className="form-control" id="mobile-number" placeholder="Mobile Number" {...form.bind("mobile")} minLength="10" maxLength="10" onKeyPress={(e) => { if ((isNumberKey(e)) === false) e.preventDefault(); }} />
                  </div>
                  <div className="form-group">
                    {(form.hasError('organization', 'required')) && (
                    <MatError className="ml-2" style={{ color: "#f44336" }}>
                      {' '}Organization is required{' '}
                    </MatError>
                    )}
                    <input type="text" className="form-control" id="organization" placeholder="Organization" {...form.bind("organization")} />
                  </div>
                  <div className="form-group">
                    {(form.hasError('description', 'required')) && (
                    <MatError className="ml-2" style={{ color: "#f44336" }}>
                      {' '}Description is required{' '}
                    </MatError>
                    )}
                    <textarea className="form-control" rows="3" cols="50" name="description" placeholder="Description" {...form.bind("description")}></textarea>
                  </div>
                  <div className="form-group">
                    <button type="submit" className="btn btn-login" style={{ background: "#EF7E22", color: "#fff" }}>
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="col-lg-6 col-md-12 col-12">
              <div className="skill-image" style={{ textAlign: "center" }}>
                <img src="/assets/img/feedback-img.png" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}
