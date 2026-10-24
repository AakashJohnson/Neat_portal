'use client';
// Port of components/users/institute/institute-details (the institute shell's
// default child and "institute-details"). The profile form is shown until the
// details are submitted ('Kindly update your Profile!'); "Edit" only reloads
// that state (the form is not pre-filled, as in the original). The free-seat
// Excel upload is embedded for Government / Govt aided institutes without
// student records.
import { useState } from 'react';
import Scope from '@/components/common/Scope';
import { MatError } from '@/components/mat/MatError';
import { MatOption, MatSelect } from '@/components/mat/MatSelect';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import InstituteFileUpload from '@/components/institute/InstituteFileUpload';
import { instituteService, studentService } from '@/services';
import { subscribe } from '@/lib/api';
import { emailValidator } from '@/lib/appValidators';
import { useFormGroup, Validators } from '@/lib/forms';
import { useNgOnInit } from '@/lib/useNgOnInit';

const isNumberKey = (evt) => {
  const charCode = evt.which ? evt.which : evt.keyCode;
  return charCode >= 48 && charCode <= 57;
};
const numberKeyFilter = (e) => {
  if (isNumberKey(e) === false) e.preventDefault();
};

export default function InstituteDetails() {
  const { claims, ready, legacyDecodable } = useSession();
  const form = useFormGroup({
    institute_name: ['', [Validators.required]],
    institute_aishe_code: [''],
    institute_email: [null, [Validators.required, emailValidator]],
    institute_address: ['', [Validators.required]],
    institute_state: ['', [Validators.required]],
    institute_neat_coordinator: ['', [Validators.required]],
    // + template minlength="10" maxlength="10"
    institute_mobile: [null, [Validators.required, Validators.pattern('[0-9]*'), Validators.minLength(10), Validators.maxLength(10)]],
    // + template maxlength="11"
    institute_landline: ['', [Validators.required, Validators.maxLength(15), Validators.pattern('[0-9]*'), Validators.minLength(6), Validators.maxLength(11)]],
    institute_students_number: ['', [Validators.required]],
    institute_contact_person_email: [null, [Validators.required, emailValidator]],
  });
  const [States, setStates] = useState([]);
  const [instituteDetailsForm, setInstituteDetailsForm] = useState(undefined);
  const [showMatErrors, setShowMatErrors] = useState(undefined);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [instituteDetails, setInstituteDetails] = useState(undefined);

  const showHide = () => {
    subscribe(instituteService.getInstituteDetails(), (data) => {
      if (data['institute_type'] == 'Govt aided' || data['institute_type'] == 'Government') {
        setShowExcelUpload(!(data['std_rec'] > 0));
      }
      if (data['institute_details_updated'] != 'Yes') {
        setInstituteDetailsForm(true);
        alert('Kindly update your Profile!');
      } else {
        setInstituteDetails(data['institute_details'][0]);
        setInstituteDetailsForm(false);
      }
    });
  };

  // constructor: getStates(); ngOnInit: checkFileUpload + showHide().
  useNgOnInit(() => {
    subscribe(studentService.getStates(), (data) => setStates(data['states']));
    // handleFileUpload: `if (data['']) showExcelUpload = false` — data[''] is never set.
    subscribe(studentService.checkFileUpload(), (data) => {
      if (data['message'] == 'Success' && data['']) setShowExcelUpload(false);
    });
    showHide();
  });

  const onSubmit = () => {
    const values = { ...form.value };
    if (ready && claims) {
      if (!legacyDecodable) return; // inline atob decode threw
      values['permanent_institute_id'] = claims['permanent_institute_id'];
    }
    if (form.valid) {
      setShowMatErrors(false);
      subscribe(
        instituteService.submitInstituteDetails(values),
        (data) => {
          if (data['message'] == 'Success') {
            toastr.success('Details uploaded successfully');
            showHide();
          }
          if (data['message'] == 'Error') toastr.info(data['reason'], 'Info');
        },
        (res) => console.log(res),
      );
    } else {
      setShowMatErrors(true);
      toastr.warning('Please fill valid details!');
    }
  };

  const err = (name, code, text) => form.hasError(name, code) && showMatErrors && <MatError className="ml-2"> {text} </MatError>;
  const input = (name, attrs) => <input type="text" {...form.bind(name)} className="form-control" {...attrs} />;

  return (
    <>
      <Scope name="institute-details">
        <div className="contact-form-area section-padding">
          <div className="container">
            <div className="row">
              <div className="col-md-12">
                <div className="section-title-wrapper">
                  <div className="section-title">
                    <h3 style={{ marginTop: '40px' }}>Institutes</h3>
                  </div>
                </div>
              </div>
            </div>
            <div className="row">
              {instituteDetailsForm && (
                <div className="col-lg-12 col-md-12">
                  <form
                    id="contact-form"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      form.markSubmitted();
                      onSubmit();
                    }}
                  >
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        {err('institute_name', 'required', 'Name of Institution is required')}
                        {input('institute_name', { name: 'nameofinstitution', placeholder: 'Name of Institution' })}
                      </div>
                      <div className="col-md-4 mb-3">
                        {err('institute_aishe_code', 'required', 'AICTE/AISHE Code is required')}
                        {input('institute_aishe_code', { name: 'aicteaishecode', placeholder: 'AICTE/AISHE Code' })}
                      </div>
                      <div className="col-md-4 mb-3">
                        {err('institute_email', 'required', 'Email is required')}
                        {input('institute_email', { type: 'email', name: 'email2', placeholder: 'Email' })}
                      </div>
                      <div className="col-md-8 mb-3">
                        {err('institute_address', 'required', 'Address is required')}
                        {input('institute_address', { name: 'address', placeholder: 'Address' })}
                      </div>
                      <div className="col-md-4 mb-3" appearance="fill">
                        {err('institute_state', 'required', 'State is required')}
                        <MatSelect className="form-control" placeholder="State" {...form.bindValue('institute_state')} invalid={form.errorState('institute_state')} required>
                          {(States ?? []).map((option, i) => (
                            <MatOption key={i} value={`${option}`}>
                              {option}{' '}
                            </MatOption>
                          ))}
                        </MatSelect>
                      </div>
                      <div className="col-md-4 mb-3">
                        {err('institute_neat_coordinator', 'required', 'NEAT Coordinator Name is required')}
                        {input('institute_neat_coordinator', { name: 'neatcoordinator', placeholder: 'NEAT Coordinator' })}
                      </div>
                      <div className="col-md-4 mb-3">
                        {err('institute_contact_person_email', 'required', 'Email of NEAT Coordinator is required')}
                        {input('institute_contact_person_email', { name: 'institute_contact_person_email', placeholder: 'Email of NEAT Coordinator' })}
                      </div>
                      <div className="col-md-4 mb-3">
                        {err('institute_mobile', 'required', 'Mobile Number is required')}
                        {err('institute_mobile', 'minlength', 'Mobile Number should be of 10 digits')}
                        {input('institute_mobile', { minLength: '10', maxLength: '10', onKeyPress: numberKeyFilter, name: 'mobilenumber', placeholder: 'Mobile Number (to be valid)' })}
                      </div>
                      <div className="col-md-4 mb-3">
                        {err('institute_landline', 'required', 'Institute Landline Number is required')}
                        {input('institute_landline', { maxLength: '11', onKeyPress: numberKeyFilter, name: 'landlinenumber', placeholder: 'Landline Number' })}
                      </div>
                      <div className="col-md-4 mb-3">
                        {err('institute_students_number', 'required', 'No. of Students is required')}
                        {input('institute_students_number', { onKeyPress: numberKeyFilter, name: 'noofstudents', placeholder: 'No. of Students' })}
                      </div>
                      <div className="col-md-12 mb-3 aligncenter">
                        <button type="submit" className="btn btn-login float-right" style={{ background: '#EF7E22', color: '#fff', fontWeight: 600 }}>
                          SUBMIT
                        </button>
                        <button type="button" onClick={() => form.reset()} className="btn btn-login float-right reset" style={{ background: '#EF7E22', color: '#fff', fontWeight: 600, marginRight: '10px' }}>
                          RESET
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
              {!instituteDetailsForm && (
                <div className="col-lg-12 col-md-12">
                  <table className="table table-striped table-hover">
                    <tbody>
                      {[
                        ['Institute Name', 'institute_name'],
                        ['AISHE/AICTE Code', 'institute_aishe_code'],
                        ["Director's Email", 'institute_email'],
                        ['Address of Institute', 'institute_address'],
                        ['Landline of Institute', 'institute_landline'],
                        ['State', 'institute_state'],
                        ["NEAT Co-ordinator's Name", 'institute_neat_coordinator'],
                        ["NEAT Co-ordinator's Mobile", 'institute_mobile'],
                        ["NEAT Co-ordinator's Email", 'institute_contact_person_email'],
                        ['Student Count', 'institute_students_number'],
                      ].map(([label, key]) => (
                        <tr key={key}>
                          <th scope="row">{label}</th>
                          <td> {instituteDetails?.[key]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="col-md-12 aligncenter">
                    <button
                      type="button"
                      onClick={() => subscribe(instituteService.editInstituteDetails(), () => showHide())}
                      className="btn btn-login float-right"
                      style={{ background: '#EF7E22', color: '#fff', fontWeight: 600, marginBottom: '40px' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {showExcelUpload && (
          <div>
            <InstituteFileUpload />
          </div>
        )}
      </Scope>
    </>
  );
}
