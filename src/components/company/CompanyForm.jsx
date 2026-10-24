'use client';
// Port of components/users/company/company-form (route company/form/:id): the
// company's product page form (rich-text fields in <angular-editor>, now
// TipTap — DEV-F08), course image / video / B2B discount table uploads, and the
// submitted-details preview (CourseFormPreview) once isDetailsSubmitted is
// 'Yes'. Kept from the original:
//   - ngOnInit() rebuilds the form with its initial values (' ' / null) and
//     reloads the product; it runs again after a file upload and after "Edit
//     details" in the preview;
//   - <mat-error> shows as soon as a control has a required error;
//   - setPreviousValuesForm() sets payment_link twice, the second time to
//     product_direct_url, and never sets product_direct_url (R-39), while the
//     inputs' value="{{products?.…}}" bindings display the stored values;
//   - start/end/interactive dates are not prefilled and are sent as D-M-YYYY
//     (null → 1-1-1970); typing in them is blocked (two keypress filters).
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Scope from '@/components/common/Scope';
import AngularEditor from '@/components/editor/AngularEditor';
import CourseFormPreview from '@/components/company/CourseFormPreview';
import { MatError } from '@/components/mat/MatError';
import MatInput from '@/components/mat/MatInput';
import MatProgressSpinner from '@/components/mat/MatProgressSpinner';
import { MatOption, MatSelect } from '@/components/mat/MatSelect';
import MatTooltip from '@/components/mat/MatTooltip';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle, useDatepicker } from '@/components/mat/MatDatepicker';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { companyService, courseService } from '@/services';
import { subscribe } from '@/lib/api';
import { uploadFile } from '@/lib/fileUpload';
import { fileUrl } from '@/lib/format';
import { useFormGroup, Validators } from '@/lib/forms';
import { useNgOnInit } from '@/lib/useNgOnInit';

const required = [Validators.required];
const SPEC = {
  short_description: [' ', required],
  requirements_heading: [' ', required],
  requirements_description: [' ', required],
  description_heading: [' ', required],
  description: [' ', required],
  product_highlights: [' ', required],
  product_category: [' ', required],
  pre_requisites: [' ', required],
  course_deliverables: [' ', required],
  faqs: [' ', required],
  refund_policy: [' ', required],
  additional_cost: [' '],
  course_duration: [' '],
  minimum_batch: [' '],
  course_start_date: [null],
  course_end_date: [null],
  interactive_session: [null],
  examination_dates: [' '],
  payment_link: [null],
  product_direct_url: [null],
  terms_conditions: [' ', required],
};
const INITIAL = Object.fromEntries(Object.entries(SPEC).map(([k, [v]]) => [k, v]));
// setPreviousValuesForm(): control ← products field (in this order).
const PREVIOUS_VALUES = [
  ['short_description', 'short_description'],
  ['requirements_heading', 'requirements_heading'],
  ['requirements_description', 'requirements_description'],
  ['description_heading', 'description_heading'],
  ['description', 'description'],
  ['product_highlights', 'product_highlights'],
  ['product_category', 'product_category'],
  ['pre_requisites', 'pre_requisites'],
  ['course_deliverables', 'course_deliverables'],
  ['faqs', 'faqs'],
  ['refund_policy', 'refund_policy'],
  ['additional_cost', 'additional_cost'],
  ['course_duration', 'course_duration'],
  ['minimum_batch', 'minimum_batch'],
  ['examination_dates', 'examination_dates'],
  ['payment_link', 'payment_link'],
  ['payment_link', 'product_direct_url'],
  ['terms_conditions', 'terms_conditions'],
];
// <input formControlName="x" value="{{products?.x}}">: inputs whose DOM value is
// also bound to the product field.
const VALUE_BOUND = ['requirements_heading', 'description_heading', 'refund_policy', 'additional_cost', 'course_duration', 'minimum_batch', 'examination_dates', 'payment_link', 'product_direct_url'];
const CATEGORIES = [
  ['Niche areas (list of areas to be defined)', 'Niche areas (list of areas to be defined)'],
  ['Cognitive skill development', 'Cognitive skill development'],
  ['Digital Laboratory (including simulation labs)', 'Digital Laboratory (including simulation labs)'],
  ['Digital Coding skill development', 'Digital Coding skill development '],
  ['Digital Assessment tests', 'Digital Assessment tests'],
  ['Digital Psychometric tests', 'Digital Psychometric tests'],
  ['Placement support digital solution (including internship and career counselling)', ' Placement support digital solution (including internship and career counselling) '],
  ['Digital Classroom management/ Learning Management', 'Digital Classroom management/ Learning Management'],
  ['Basic courses/tools/products that bridge learning gaps among students', ' Basic courses/tools/products that bridge learning gaps among students'],
  ['Others, which have adaptive learning digital capabilities', 'Others, which have adaptive learning digital capabilities'],
];

const charCode = (evt) => (evt.which ? evt.which : evt.keyCode);
const isNumberKey = (evt) => charCode(evt) >= 48 && charCode(evt) <= 57;
const isCharKey = (evt) => !(charCode(evt) >= 48 && charCode(evt) <= 57);
const bothKeyFilters = (e) => {
  if (isCharKey(e) === false) e.preventDefault();
  if (isNumberKey(e) === false) e.preventDefault();
};
const interpolate = (v) => (v === undefined || v === null ? '' : String(v));

/** new Date(v) as D-M-YYYY (NaN-NaN-NaN for unparsable values), as onSubmit builds it. */
const dmy = (v) => `${new Date(v).getDate()}-${new Date(v).getMonth() + 1}-${new Date(v).getFullYear()}`;

export default function CompanyForm() {
  const { id: productCode } = useParams();
  const { claims, legacyDecodable } = useSession();
  const form = useFormGroup(SPEC);
  const startPicker = useDatepicker();
  const endPicker = useDatepicker();
  const sessionPicker = useDatepicker();
  const [products, setProducts] = useState(undefined);
  const [showForm, setShowForm] = useState(undefined);
  const [, setPaymentLink] = useState(undefined);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(true);
  const [paths, setPaths] = useState({});
  // DOM value of the value-bound inputs: the last of control write / binding change / typing.
  const [dom, setDom] = useState({});
  const boundValues = useRef({});

  const writeControl = (name, v) => {
    form.setValue(name, v, { markDirty: false });
    if (VALUE_BOUND.includes(name)) setDom((d) => ({ ...d, [name]: interpolate(v) }));
  };

  // value="{{products?.x}}" re-applies only when the interpolated string changes.
  useEffect(() => {
    if (!showForm) return;
    const changed = {};
    for (const name of VALUE_BOUND) {
      const s = interpolate(products?.[name]);
      if (boundValues.current[name] !== s) changed[name] = boundValues.current[name] = s;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM property binding applied after the control writes of the same tick
    if (Object.keys(changed).length) setDom((d) => ({ ...d, ...changed }));
  }, [products, showForm]);

  const setPreviousValuesForm = (data) => {
    const p = data['products'];
    setPaths({
      course_logo: fileUrl(`files/course_logo/${interpolate(p.course_logo_file)}`),
      course_video: fileUrl(`files/product_video/${interpolate(p.product_video_file)}`),
      b2b_discount_table: fileUrl(`files/b2b_discount_table/${interpolate(p.b2b_discount_table_file)}`),
    });
    for (const [control, field] of PREVIOUS_VALUES) writeControl(control, data['products'][field]);
  };

  // ngOnInit(): a new FormGroup with the initial values, then the product.
  const init = () => {
    form.reset(INITIAL);
    setDom(Object.fromEntries(VALUE_BOUND.map((n) => [n, interpolate(INITIAL[n])])));
    subscribe(courseService.getProductDetails({ code: productCode }), (data) => {
      setProducts(data['products']);
      setShowLoadingSpinner(false);
      setPaymentLink(data['products']['product_type'] != 'B2B');
      if (data['products']['isDetailsSubmitted'] == 'Yes') {
        setShowForm(false);
      } else {
        setShowForm(true);
        setPreviousValuesForm(data);
      }
    });
  };
  useNgOnInit(init);

  const handleResponse = (data) => {
    if (data['message'] == 'Exists') toastr.error('The Product does not exists ');
    else if (data['message'] == 'Error') toastr.error(data['reason']);
    else toastr.success('Data Updated Successful!');
    subscribe(courseService.getProductDetails({ code: productCode }), (res) => setShowForm(res['products']['isDetailsSubmitted'] != 'Yes'));
  };

  const onSubmit = (formValues) => {
    const values = { ...formValues };
    values['course_start_date'] = dmy(values['course_start_date']);
    values['course_end_date'] = dmy(values['course_end_date']);
    values['interactive_session'] = dmy(values['interactive_session']);
    if (!legacyDecodable || !claims) return; // the inline atob decode throws
    values['user_id'] = claims['user_id'];
    values['code'] = productCode;
    values['application_number'] = claims['application_number'];
    if (form.valid) subscribe(companyService.submitProductDetails(values), handleResponse);
    else toastr.error('Please fill all the details');
  };

  const onUploadFile = (event) => {
    uploadFile(event, event.target.id, productCode);
    subscribe(courseService.getProductDetails({ code: productCode }), (data) => {
      const p = data['products'];
      setProducts(p);
      setPaths({
        course_logo: fileUrl(`files/course_logo/${interpolate(p.course_logo_file)}`),
        course_video: fileUrl(`files/product_video/${interpolate(p.product_video_file)}`),
        b2b_discount_table: fileUrl(`files/b2b_discount_table/${interpolate(p.b2b_discount_table_file)}`),
      });
    });
    init();
  };

  const err = (name, text) => form.hasError(name, 'required') && <MatError>{text}</MatError>;
  const editor = (name, withPlaceholder = false) => <AngularEditor {...form.bindValue(name)} placeholder={withPlaceholder ? 'Enter text here...' : ''} />;
  const input = (name, attrs = {}) => (
    <MatInput
      type="text"
      className="form-control"
      name={name}
      value={dom[name] ?? ''}
      onChange={(e) => {
        setDom((d) => ({ ...d, [name]: e.target.value }));
        form.setValue(name, e.target.value);
      }}
      onBlur={() => form.markAsTouched(name)}
      {...attrs}
    />
  );
  const fileSelect = (label, inputEl) => (
    <div className="file-upload">
      <div className="file-select">
        <div className="file-select-button" id="fileName">
          {label}
        </div>
        <div className="file-select-name" id="noFile">
          No file chosen...
        </div>
        {inputEl}
      </div>
    </div>
  );
  const datepicker = (picker, name, label, placeholder, toggleSide) => (
    <div className="col-md-4 mb-4">
      <div className="row">
        <div className="col-10">
          <label className="custom-label">{label}</label>
          <MatDatepickerInput picker={picker} form={form} name={name} id={name} className="form-control" placeholder={placeholder} onKeyPress={bothKeyFilters} />
        </div>
        <div className="col-2">
          <MatDatepickerToggle picker={picker} {...{ [toggleSide]: '' }} />
          <MatDatepicker picker={picker} />
        </div>
      </div>
    </div>
  );

  return (
    <Scope name="company-form">
      {/* Component styles of angular-editor, injected on first use as in Angular. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/legacy/angular-editor.css" precedence="default" />
      {!showLoadingSpinner && (
        <div>
          {showForm && (
            <div className="contact-form-area section-padding">
              <div className="container">
                <div className="row">
                  <div className="col-md-12">
                    <div className="section-title-wrapper">
                      <div className="section-title">
                        <h3 style={{ marginTop: '40px' }}>Company Course/Product Details</h3>
                      </div>
                    </div>
                  </div>
                </div>
                <form
                  className="form-horizontal"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    form.markSubmitted();
                    onSubmit(form.value);
                  }}
                >
                  <div className="form-group row">
                    <div className="col-sm-4">
                      <h5>Company Name - {products?.company_name}</h5>
                    </div>
                    <div className="col-sm-6 mb-3">
                      <h5>Course Name - {products?.course_name}</h5>
                    </div>
                  </div>

                  <div className="form-group row">
                    <div className="col-sm-4 mb-3">
                      <div>
                        <img width="350" height="250" src={paths.course_logo} alt="courseLogo" />
                      </div>
                      {fileSelect('Upload course image', <input type="file" name="course_logo" id="course_logo" onChange={onUploadFile} />)}
                    </div>

                    <div className="col-sm-4 mb-3">
                      <div>
                        <video controls height="250" width="350" preload="auto" src={paths.course_video} poster=""></video>
                      </div>
                      {fileSelect(
                        'Upload course video',
                        <MatTooltip message="The File should be less than 100 MB">
                          <input type="file" name="product_video" id="product_video" mattooltip="The File should be less than 100 MB" onChange={onUploadFile} accept="video/mp4" />
                        </MatTooltip>,
                      )}
                    </div>

                    <div className="col-sm-4 mb-3">
                      <div>
                        <img width="350" height="250" src={paths.b2b_discount_table} alt="courseLogo" />
                      </div>
                      {fileSelect('Upload B2B Discount Table Image (For B2B Products Only)', <input type="file" name="b2b_discount_table" id="b2b_discount_table" onChange={onUploadFile} />)}
                    </div>

                    <div className="col-sm-12 mb-3">
                      <label className="custom-label">Add Short Description</label>
                      {editor('short_description')}
                      {err('short_description', 'Short Description is required')}
                    </div>
                  </div>
                  <div className="line"></div>
                  <div className="form-group row">
                    <div className="col-sm-12 mb-3">
                      <label className="custom-label">Add Requirements Heading</label>
                      {input('requirements_heading', { placeholder: 'Add Requirements Heading' })}
                      {err('requirements_heading', 'Requirements Heading is required')}
                    </div>
                    <div className="col-sm-12">
                      <label className="custom-label">Add Requirements Description</label>
                      {editor('requirements_description', true)}
                      {err('requirements_description', 'Requirements Description is required')}
                    </div>
                  </div>
                  <div className="line"></div>
                  <div className="form-group row">
                    <div className="col-sm-12 mb-3">
                      <label className="custom-label">Add Description Heading</label>
                      {input('description_heading', { placeholder: 'Add Description Heading' })}
                      {err('description_heading', 'Description Heading is required')}
                    </div>
                    <div className="col-sm-12 mb-3">
                      <label className="custom-label">Add Description</label>
                      {editor('description', true)}
                      {err('description', 'Description is required')}
                    </div>
                  </div>
                  <div className="form-group row">
                    <div className="col-sm-6">
                      <label className="custom-label">Select Product Type</label>
                      <span style={{ float: 'left', width: '100%', fontSize: '17px', fontFamily: 'poppins,sans-serif' }}>{products?.product_type}</span>
                    </div>

                    <div className="col-sm-6">
                      <label className="custom-label">Certification Course</label>
                      <MatTooltip message="Please select the product bucket">
                        <MatSelect
                          name="account"
                          mattooltip="Please select the product bucket"
                          placeholder={interpolate(products?.product_category)}
                          className="form-control mb-3"
                          {...form.bindValue('product_category')}
                        >
                          {CATEGORIES.map(([value, text]) => (
                            <MatOption key={value} value={value}>
                              {text}
                            </MatOption>
                          ))}
                        </MatSelect>
                      </MatTooltip>
                      {err('product_category', 'Product Category is required')}
                    </div>

                    <div className="col-sm-12">
                      <label className="custom-label">Product Highlights</label>
                      {editor('product_highlights', true)}
                      {err('product_highlights', 'Product Highlights are required')}
                    </div>

                    <div className="col-sm-12">
                      <label className="custom-label">Pre Requisites for course</label>
                      {editor('pre_requisites', true)}
                      {err('pre_requisites', 'Pre - Requisites are required')}
                    </div>
                    <div className="col-sm-12">
                      <label className="custom-label">Course deliverables</label>
                      {editor('course_deliverables')}
                      {err('course_deliverables', 'Course Deliverables is required')}
                    </div>

                    <div className="col-sm-12 mb-3">
                      <label className="custom-label">Add Price</label>
                      <span style={{ float: 'left', width: '100%', fontSize: '17px', fontFamily: 'poppins,sans-serif' }}>{products?.price}</span>
                    </div>
                  </div>
                  <div className="line"></div>
                  <div className="form-group row">
                    <div className="col-sm-12 mb-3">
                      <label className="custom-label">FAQs and Dos and Don’ts for learners</label>
                      {editor('faqs')}
                      {err('faqs', 'FAQs are required')}
                    </div>
                    <div className="col-sm-4 mb-3">
                      <label className="custom-label">Refund Policy</label>
                      <MatTooltip message="Please enter the complete Refund Policy of the product. The same would be shown for acceptance at the time of sale of product">
                        {input('refund_policy', {
                          mattooltip: 'Please enter the complete Refund Policy of the product. The same would be shown for acceptance at the time of sale of product',
                          placeholder: 'Refund Policy',
                        })}
                      </MatTooltip>
                      {err('refund_policy', 'Refund Policy is required')}
                    </div>

                    <div className="col-sm-4 mb-3">
                      <label className="custom-label">Cost of additional certification examination (if any)</label>
                      {input('additional_cost', {
                        placeholder: 'Cost of additional certification examination (if any)',
                        onKeyPress: (e) => {
                          if (isNumberKey(e) === false) e.preventDefault();
                        },
                      })}
                      {err('additional_cost', 'Additional Cost is required')}
                    </div>

                    <div className="col-sm-4 mb-3">
                      <label className="custom-label">Course duration (if any)</label>
                      {input('course_duration', { placeholder: 'Course duration (if any)' })}
                      {err('course_duration', 'Course Duration is required')}
                    </div>

                    {datepicker(startPicker, 'course_start_date', 'Select Start Date', 'Select Start Date', 'matprefix')}
                    {datepicker(endPicker, 'course_end_date', 'Select End Date', 'Select End Date', 'matsuffix')}
                    {datepicker(sessionPicker, 'interactive_session', 'Select Interactive Sessions', 'Select Interactive Sessions', 'matsuffix')}

                    <div className="col-sm-4 mb-3">
                      <label className="custom-label">Minimum batch size (TBD)</label>
                      {input('minimum_batch', { placeholder: 'Minimum batch size (TBD)' })}
                      {err('minimum_batch', 'Minimum batch is required')}
                    </div>

                    <div className="col-sm-4">
                      <label className="custom-label">Examination dates (if any)</label>
                      {input('examination_dates', { placeholder: 'Examination dates (if any)' })}
                      {err('examination_dates', 'Examination dates is required')}
                    </div>
                    <div className="col-sm-4">
                      <label className="custom-label">Course Fee Payment Link</label>
                      {input('payment_link', { placeholder: 'Course Fee Payment Link' })}
                    </div>
                    <div className="col-sm-4">
                      <label className="custom-label">Course/Product link</label>
                      {input('product_direct_url', { placeholder: 'Course/Product link (if any)' })}
                    </div>
                    <div className="col-sm-12">
                      <label className="custom-label">Terms and conditions for the sale of product</label>
                      {editor('terms_conditions')}
                      {err('terms_conditions', 'Terms and Conditions are required')}
                    </div>
                  </div>
                  <div className="line"></div>
                  <div className="form-group row">
                    <div>
                      <button type="submit" className="btn btn-login float-right" style={{ background: '#EF7E22', color: '#fff', fontWeight: 600, marginRight: '10px' }}>
                        Submit
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
          {!showForm && (
            <div>
              <CourseFormPreview onMessage={(message) => message == true && init()} />
            </div>
          )}
        </div>
      )}
      {showLoadingSpinner && (
        <div className="loading-indicator">
          <MatProgressSpinner />
        </div>
      )}
    </Scope>
  );
}
