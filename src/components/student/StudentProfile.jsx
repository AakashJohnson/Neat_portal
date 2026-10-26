'use client';


import Scope from '@/components/common/Scope';
import { MatError } from '@/components/mat/MatError';
import MatInput from '@/components/mat/MatInput';
import { MatSelect, MatOption } from '@/components/mat/MatSelect';
import { useFormGroup, Validators } from '@/lib/forms';
import { useState } from 'react';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle, useDatepicker } from '@/components/mat/MatDatepicker';
import MatTooltip from '@/components/mat/MatTooltip';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { studentService } from '@/services';
import { apiErrorMessage, httpErrorResponse, subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

const charCode = (evt) => (evt.which ? evt.which : evt.keyCode);
const isNumberKey = (evt) => charCode(evt) >= 48 && charCode(evt) <= 57;
const isCharKey = (evt) => !(charCode(evt) >= 48 && charCode(evt) <= 57);

export default function StudentProfile() {
  const { claims, ready } = useSession();
  const picker = useDatepicker();
  const [years] = useState(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2015 + 1 }, (_, i) => 2015 + i);
  });
  const [minDate] = useState(() => new Date(1989, 0, 1));
  const [maxDate] = useState(() => new Date(2012, 11, 31));
  const form = useFormGroup({
    name_of_learner: [{ value: '', disabled: true }],
    father_name: [null, [Validators.required]],
    date_of_birth: [null, [Validators.required]],
    residential_address: [null, [Validators.required]],
    state: [null, [Validators.required]],
    category: [null, [Validators.required]],
    gender: [null, [Validators.required]],
    college_state: [null, [Validators.required]],
    college_name: [{ value: null, disabled: true }, [Validators.required]],
    // Used only when the user selects Other.
    college_name_other: [''],
    year_of_admission: [null, [Validators.required]],
    identity_number: [null, [Validators.required]],
    admission_registration_number: [null, [Validators.required]],
    stream_of_education: [null, [Validators.required]],
    academic_record: [null, [Validators.required]],
  });
  const [States, setStates] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [studentDetails, setStudentDetails] = useState({});
  const [showMatErrors, setShowMatErrors] = useState(false);
  const [showOtherCollege, setShowOtherCollege] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  /** handleResponse(error): API error message, else the HTTP error text. */
  const handleResponse = (res) => {
    const error = httpErrorResponse(res);
    let message = 'Something went wrong. Please try again.';
    if (error && error.error) {
      if (error.error.message) message = error.error.message;
      else if (typeof error.error === 'string') message = error.error;
    } else if (error && error.message) message = error.message;
    toastr.error(message);
  };

  const onCollegeChange = (value) => {
    const other = value === 'Other';
    setShowOtherCollege(other);
    if (other) form.setValidators('college_name_other', [Validators.required, Validators.pattern(/\S/)]);
    else {
      form.setValidators('college_name_other', null);
      form.setValue('college_name_other', '', { markDirty: false });
    }
  };

  const getInstituesFromState = (event, existingCollegeName) => {
    const collegeState = event && event.value ? event.value : event;
    if (!collegeState) {
      setColleges([]);
      form.disable('college_name');
      form.setValue('college_name', null, { markDirty: false });
      return;
    }
    setColleges([]);
    form.setValue('college_name', null, { markDirty: false });
    form.enable('college_name');
    setShowOtherCollege(false);
    form.setValue('college_name_other', '', { markDirty: false });
    form.setValidators('college_name_other', null);
    if (!claims) {
      toastr.error('Please log in again.');
      return;
    }
    console.log('Request data:', { college_state: collegeState });
    subscribe(
      studentService.getCollegeNames({ college_state: collegeState }),
      (response) => {
        console.log('College API response:', response);
        let list = [];
        if (Array.isArray(response)) list = response;
        else if (response && Array.isArray(response.colleges)) list = response.colleges;
        else if (response && Array.isArray(response.data)) list = response.data;
        setColleges(list);
        if (existingCollegeName) {
          const found = list.find((college) => college.name === existingCollegeName);
          if (found) {
            form.setValue('college_name', found.name, { markDirty: false });
            onCollegeChange(found.name);
          } else {
            form.setValue('college_name', 'Other', { markDirty: false });
            form.setValue('college_name_other', existingCollegeName, { markDirty: false });
            onCollegeChange('Other');
          }
        }
      },
      (res) => {
        console.error('College API error:', httpErrorResponse(res));
        setColleges([]);
        toastr.error('Unable to load colleges for the selected state.');
      },
    );
  };

  const setStudentData = (response) => {
    console.log('Student API response:', response);
    if (response && response.student_details && response.student_details.length > 0) {
      const details = response.student_details[0];
      setStudentDetails(details);
      // DD-MM-YYYY → Date
      let dob = null;
      if (details.date_of_birth) {
        const parts = details.date_of_birth.split('-');
        if (parts.length === 3) dob = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
      form.patchValue({
        name_of_learner: details.name_of_learner,
        email: details.email,
        contact_number: details.contact_number,
        father_name: details.father_name,
        date_of_birth: dob,
        residential_address: details.residential_address,
        state: details.state,
        category: details.category,
        gender: details.gender,
        college_state: details.college_state,
        college_name: details.college_name,
        year_of_admission: String(details.year_of_admission),
        identity_number: details.identity_number,
        admission_registration_number: details.admission_registration_number,
        stream_of_education: details.stream_of_education,
        academic_record: details.academic_record,
      });
      if (details.college_state) getInstituesFromState({ value: details.college_state }, details.college_name);
      console.log('Student details assigned:', details);
    } else {
      setStudentDetails({});
      console.log('No student record found in API response.');
    }
  };

  // constructor: getStates(); ngOnInit: student details when a token exists.
  useNgOnInit(() => {
    subscribe(
      studentService.getStates(),
      (data) => setStates(data && data['states'] ? data['states'] : []),
      handleResponse,
    );
    if (claims) subscribe(studentService.getStudentDetails(), setStudentData, handleResponse);
    else toastr.error('Please log in again.');
  }, ready);

  const onSubmit = () => {
    if (saving) return;
    setShowMatErrors(true);
    if (form.invalid) {
      form.markAllAsTouched();
      toastr.error('Please fill all required fields.');
      return;
    }
    if (!claims) {
      toastr.error('Please log in again.');
      return;
    }
    const payload = form.getRawValue();
    if (payload.college_name === 'Other') {
      const otherCollegeName = (payload.college_name_other || '').trim();
      if (!otherCollegeName) {
        toastr.error('Please enter your college name.');
        return;
      }
      payload.college_name = otherCollegeName;
    }
    delete payload.college_name_other;
    if (payload.date_of_birth instanceof Date) {
      const date = payload.date_of_birth;
      payload.date_of_birth = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    }
    setSaving(true);
    subscribe(
      studentService.submitStudentDetails(payload),
      (response) => {
        setSaving(false);
        if (response?.message !== 'Success') {
          toastr.error(apiErrorMessage({ data: response }));
          return;
        }
        toastr.success(response && response['message'] ? response['message'] : 'Student details saved successfully.');
        setShowMatErrors(false);
        subscribe(
          studentService.getStudentDetails(),
          (data) => {
            setStudentData(data);
            setIsEditMode(false);
            setShowMatErrors(false);
          },
          (res) => {
            setSaving(false);
            handleResponse(res);
          },
        );
      },
      handleResponse,
    );
  };

  const resetForm = () => {
    form.reset();
    setColleges([]);
    setShowOtherCollege(false);
    setShowMatErrors(false);
    form.disable('college_name');
    form.setValidators('college_name_other', null);
    form.setValue('college_name_other', '', { markDirty: false });
  };

  const editDetails = () => {
    setIsEditMode(true);
    if (!claims) {
      toastr.error('Please log in again.');
      return;
    }
    subscribe(
      studentService.editStudentDetails(),
      (response) => {
        form.enableAll();
        if (response && response['message']) toastr.success(response['message']);
      },
      handleResponse,
    );
  };

  return (
    <Scope name="student-profile">
      <div className="contact-form-area section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title">
                  <h3 style={{ marginTop: "40px" }}>
                    Student
                  </h3>
                </div>
              </div>
            </div>
          </div>
          {(isEditMode) && (
          <div className="tab-content" id="nav-tabContent">
            <div className="tab-pane fade show active" id="student-tab" role="tabpanel" aria-labelledby="nav-home-tab">
              <div className="row mt-30">
                <div className="col-lg-12 col-md-12">
                  <form onSubmit={(e) => { e.preventDefault(); form.markSubmitted(); onSubmit(form.value); }} noValidate>
                    <div className="row">
                      <div className="col-md-4 mb-4">
                        <mat-label class="bold ml-2">
                          Name: {studentDetails?.name_of_learner}
                        </mat-label>
                      </div>
                      <div className="col-md-4 mb-4">
                        <mat-label class="bold ml-2">
                          Contact Number: {studentDetails?.contact_number}
                        </mat-label>
                      </div>
                      <div className="col-md-4 mb-4">
                        <mat-label class="bold ml-2">
                          Email Id: {studentDetails?.email}
                        </mat-label>
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('father_name', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          Father’s Name is required{' '}
                        </MatError>
                        )}
                        <MatInput type="text" className="form-control" {...form.bind("father_name")} placeholder="Father’s Name" onKeyPress={(e) => { if ((isCharKey(e)) === false) e.preventDefault(); }} required invalid={form.errorState("father_name")} />
                      </div>
                      <div className="col-md-4 mb-3 mb-4">
                        {(form.hasError('date_of_birth', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          Date of Birth is required{' '}
                        </MatError>
                        )}
                        <div className="row">
                          <div className="col-10">
                            {/* Two (keypress) bindings (isCharKey and isNumberKey): together they block every printable key. */}
                            <MatDatepickerInput
                              picker={picker}
                              form={form}
                              name="date_of_birth"
                              min={minDate}
                              className="form-control"
                              max={maxDate}
                              placeholder="Date of Birth"
                              invalid={form.errorState('date_of_birth')}
                              onKeyPress={(e) => {
                                if (isCharKey(e) === false) e.preventDefault();
                                if (isNumberKey(e) === false) e.preventDefault();
                              }}
                            />
                          </div>
                          <div className="col-2">
                            <MatDatepickerToggle picker={picker} matsuffix="" />
                            <MatDatepicker picker={picker} />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('gender', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          {' '}Gender is required{' '}
                        </MatError>
                        )}
                        <MatSelect className="form-control" {...form.bindValue("gender")} placeholder="Gender">
                          <MatOption value="Male">
                            Male
                          </MatOption>
                          <MatOption value="Female">
                            Female
                          </MatOption>
                          <MatOption value="Others">
                            Others
                          </MatOption>
                        </MatSelect>
                      </div>
                      <div className="col-md-8">
                        {(form.hasError('residential_address', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          {' '}Residential address is required{' '}
                        </MatError>
                        )}
                        <MatInput type="text" className="form-control" {...form.bind("residential_address")} placeholder="Residential Address" required invalid={form.errorState("residential_address")} />
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('state', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          {' '}State is required{' '}
                        </MatError>
                        )}
                        <MatSelect className="form-control" placeholder="State" {...form.bindValue("state")} required>
                          {(States ?? []).map((option, i) => (
                            <MatOption key={i} value={`${option}`}>
                            {option}{' '}
                          </MatOption>
                          ))}
                        </MatSelect>
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('identity_number', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          {' '}Identity number is required{' '}
                        </MatError>
                        )}
                        <MatInput type="text" className="form-control" {...form.bind("identity_number")} placeholder="Proof of Identity number (Like Aadhar, Voter Id or passport)" required invalid={form.errorState("identity_number")} />
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('category', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          Category is required{' '}
                        </MatError>
                        )}
                        <MatSelect className="form-control" placeholder="Category" {...form.bindValue("category")} required>
                          <MatOption value="General">
                            General (Gen)
                          </MatOption>
                          <MatOption value="Scheduled Caste">
                            Scheduled Caste (SC)
                          </MatOption>
                          <MatOption value="Scheduled Tribe">
                            Scheduled Tribe (ST)
                          </MatOption>
                          <MatOption value="Other Backward Classes">
                            Other Backward Classes (OBC){' '}
                          </MatOption>
                          <MatOption value="Economically Weaker Section">
                            Economically Weaker Section (EWS){' '}
                          </MatOption>
                        </MatSelect>
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('college_state', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          {' '}College state is required{' '}
                        </MatError>
                        )}
                        <MatSelect className="form-control" placeholder="College state" {...form.bindValue("college_state")} onSelectionChange={(value) => { getInstituesFromState({ value }); }} required>
                          {(States ?? []).map((option, i) => (
                            <MatOption key={i} value={`${option}`}>
                            {option}{' '}
                          </MatOption>
                          ))}
                        </MatSelect>
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('college_name', 'required') && showMatErrors) && (
                        <MatError>
                          {' '}College Name is required{' '}
                        </MatError>
                        )}
                        <MatSelect className="form-control" placeholder="College Name" {...form.bindValue("college_name")} onSelectionChange={(value) => { onCollegeChange(value); }} required>
                          {(colleges ?? []).map((college, i) => (
                            <MatOption key={i} value={college?.name}>
                            {' '}{college?.name}{' '}
                          </MatOption>
                          ))}
                          <MatOption value="Other">
                            Other
                          </MatOption>
                        </MatSelect>
                      </div>
                      {(showOtherCollege) && (
                      <div className="col-md-4 mb-3">
                        {(form.hasError('college_name_other', 'required') && showMatErrors) && (
                        <MatError>
                          {' '}Please enter your college name{' '}
                        </MatError>
                        )}
                        <MatInput type="text" className="form-control" {...form.bind("college_name_other")} placeholder="Enter College Name" invalid={form.errorState("college_name_other")} />
                      </div>
                      )}
                      <div className="col-md-4 mb-3">
                        {(form.hasError('year_of_admission', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          {' '}Year of Admission is required{' '}
                        </MatError>
                        )}
                        <MatSelect className="form-control" placeholder="Year of Admission" {...form.bindValue("year_of_admission")} required>
                          {(years ?? []).map((year, i) => (
                            <MatOption key={i} value={year.toString()}>
                            {' '}{year}{' '}
                          </MatOption>
                          ))}
                        </MatSelect>
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('stream_of_education', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          {' '}Stream is required{' '}
                        </MatError>
                        )}
                        <MatInput type="text" className="form-control" {...form.bind("stream_of_education")} placeholder="Stream of education / Discipline / Department" onKeyPress={(e) => { if ((isCharKey(e)) === false) e.preventDefault(); }} required invalid={form.errorState("stream_of_education")} />
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('admission_registration_number', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          {' '}Registration Number is required{' '}
                        </MatError>
                        )}
                        <MatInput type="text" className="form-control" {...form.bind("admission_registration_number")} placeholder="Admission / Registration number of college" required invalid={form.errorState("admission_registration_number")} />
                      </div>
                      <div className="col-md-4 mb-3">
                        {(form.hasError('academic_record', 'required') && showMatErrors) && (
                        <MatError className="ml-2">
                          {' '}Academic Record is required{' '}
                        </MatError>
                        )}
                        <MatTooltip message="Your academic record in the following form 12th: (Percentage), 1st year: (Percentage), 2nd year (Percentage), 3rd year: (Percentage)">
                          <MatInput mattooltip="Your academic record in the following form 12th: (Percentage), 1st year: (Percentage), 2nd year (Percentage), 3rd year: (Percentage)" type="text" className="form-control" {...form.bind("academic_record")} placeholder="Academic record for last 3 years /1 year depending upon course." min="35" max="100" required invalid={form.errorState("academic_record")} />
                        </MatTooltip>
                      </div>
                      <div className="col-md-12 aligncenter">
                        <button type="submit" disabled={saving} className="btn btn-login float-right" style={{ background: "#EF7E22", color: "#fff", fontWeight: "600" }}>
                          SUBMIT
                        </button>
                        <button type="button" onClick={resetForm} className="btn btn-login float-right reset" style={{ background: "#EF7E22", color: "#fff", fontWeight: "600", marginRight: "10px" }}>
                          RESET
                        </button>
                      </div>
                      <p>
                        {'\u00a0'}
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          )}
          {(!isEditMode) && (
          <div className="tab-content" id="nav-tabContent">
            <div className="tab-pane fade show active" id="student-tab" role="tabpanel" aria-labelledby="nav-home-tab">
              <div className="row mt-30">
                <div className="col-lg-12 col-md-12">
                  <table className="table table-striped table-hover">
                    <tbody>
                      <tr>
                        <th scope="row">
                          Name
                        </th>
                        <td>
                          {' '}{studentDetails?.name_of_learner}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Father&apos;s Name</th>
                        <td>
                          {' '}{studentDetails?.father_name}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Contact Number
                        </th>
                        <td>
                          {' '}{studentDetails?.contact_number}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Email
                        </th>
                        <td>
                          {' '}{studentDetails?.email}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Date of Birth
                        </th>
                        <td>
                          {' '}{studentDetails?.date_of_birth}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Gender
                        </th>
                        <td>
                          {' '}{studentDetails?.gender}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Address
                        </th>
                        <td>
                          {' '}{studentDetails?.residential_address}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          State
                        </th>
                        <td>
                          {' '}{studentDetails?.state}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Identity Proof
                        </th>
                        <td>
                          {' '}{studentDetails?.identity_number}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Category
                        </th>
                        <td>
                          {' '}{studentDetails?.category}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          College Name
                        </th>
                        <td>
                          {' '}{studentDetails?.college_name}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Year of Admission
                        </th>
                        <td>
                          {' '}{studentDetails?.year_of_admission}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Education Stream/Disclipline/Department
                        </th>
                        <td>
                          {' '}{studentDetails?.stream_of_education}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Admission / Registration number of college
                        </th>
                        <td>
                          {' '}{studentDetails?.admission_registration_number}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          Academic record
                        </th>
                        <td>
                          {' '}{studentDetails?.academic_record}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-12 aligncenter">
                  <button type="submit" className="btn btn-login float-right" onClick={editDetails} style={{ background: "#EF7E22", color: "#fff", fontWeight: "600", marginBottom: "20px" }}>
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </Scope>
  );
}
