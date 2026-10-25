'use client';
// Port of components/users/learner/learner-profile/learner-profile.component.{html,ts}
// (default child of the learner shell). handleResponse() re-runs ngOnInit():
// a fresh form group and a new getLearnerDetails request.
import { useCallback, useState } from 'react';
import Scope from '@/components/common/Scope';
import { MatError } from '@/components/mat/MatError';
import MatInput from '@/components/mat/MatInput';
import { MatRadioButton, MatRadioGroup } from '@/components/mat/MatRadio';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle, useDatepicker } from '@/components/mat/MatDatepicker';
import { toastr } from '@/components/common/Toastr';
import { studentService } from '@/services';
import { apiErrorMessage, subscribe } from '@/lib/api';
import { useFormGroup, Validators } from '@/lib/forms';
import { useNgOnInit } from '@/lib/useNgOnInit';

const SPEC = {
  date_of_birth: [null, [Validators.required]],
  profession: [null, [Validators.required]],
  age: [null, [Validators.required, Validators.minLength(1), Validators.maxLength(3)]],
  gender: [null, [Validators.required]],
};

export default function LearnerProfile() {
  const picker = useDatepicker();
  const [maxDate] = useState(() => new Date());
  const form = useFormGroup(SPEC);
  const [learnerDetails, setLearnerDetails] = useState(undefined);
  const [isLearnerPresent, setIsLearnerPresent] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const handleError = (res) => toastr.error(apiErrorMessage(res));

  const handleLearnerData = useCallback(
    (data, presentStatus) => {
      const d = data['learner_details'];
      if (!d || data.message === 'Error') {
        toastr.error(apiErrorMessage({ data }));
        return;
      }
      const complete = ['age', 'date_of_birth', 'gender', 'profession'].every(key => d[key] != null && d[key] !== '');
      setIsLearnerPresent(presentStatus ?? (complete && d.isDetailsSubmitted === 'Yes'));
      setLearnerDetails(d);
      if (d['date_of_birth']) {
        // dd-MM-yyyy → "yyyy-MM-dd" string parsed by Date (as in the original)
        const parts = d.date_of_birth.split('-');
        form.patchValue({ date_of_birth: new Date(`${parts[2]}-${parts[1]}-${parts[0]}`), age: d['age'], gender: d['gender'], profession: d['profession'] });
      }
    },
    [form],
  );

  // ngOnInit: (new) form group + getLearnerDetails.
  const ngOnInit = (presentStatus) => {
    form.reset();
    subscribe(studentService.getLearnerDetails(), (data) => handleLearnerData(data, presentStatus), handleError);
  };
  useNgOnInit(() => ngOnInit());

  const onSubmit = () => {
    if (saving) return;
    const values = { ...form.value };
    const dob = new Date(values['date_of_birth']);
    values['date_of_birth'] = `${dob.getDate()}-${dob.getMonth() + 1}-${dob.getFullYear()}`;
    if (form.valid) {
      setSaving(true);
      subscribe(studentService.submitLearnerDetails(values), (data) => {
        setSaving(false);
        if (data?.message !== 'Success') {
          handleError({ data });
          return;
        }
        ngOnInit(true);
        toastr.success('Profile successfully updated!');
      }, (res) => {
        setSaving(false);
        handleError(res);
      });
    } else if (['date_of_birth', 'profession', 'age', 'gender'].every((k) => form.control(k).untouched)) {
      toastr.error('Kindly fill all the details!');
    } else {
      if (form.control('date_of_birth').invalid) toastr.error('Invalid Date of Birth.');
      if (form.control('profession').invalid) toastr.error('Invalid profession.');
      if (form.control('age').invalid) toastr.error('Invalid age.');
      if (form.control('gender').invalid) toastr.error('Invalid gender.');
    }
  };

  const editLearnerDetails = () => {
    setIsLearnerPresent(false);
  };

  return (
    <Scope name="learner-profile">
      <div className="contact-form-area section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title">
                  <h3 style={{ marginTop: '40px' }}>Learner</h3>
                </div>
              </div>
            </div>
          </div>
          <div className="tab-content" id="nav-tabContent">
            {!isLearnerPresent && (
              <div className="tab-pane fade show active" id="student-tab" role="tabpanel" aria-labelledby="nav-home-tab">
                <div className="row mt-30">
                  <div className="col-lg-12 col-md-12">
                    <form
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        form.markSubmitted();
                        onSubmit();
                      }}
                    >
                      <div className="row">
                        <div className="col-md-4 mb-4">
                          <mat-label class="bold ml-2">Name: {learnerDetails?.name}</mat-label>
                        </div>
                        <div className="col-md-4 mb-4">
                          <mat-label class="bold">Contact Number: {learnerDetails?.phone}</mat-label>
                        </div>
                        <div className="col-md-4 mb-4">
                          <mat-label class="bold ml-2">Email: {learnerDetails?.email}</mat-label>
                        </div>
                        <div className="col-md-4">
                          {form.hasError('date_of_birth', 'required') && <MatError className="ml-2">Date of Birth is required </MatError>}
                          <div className="row">
                            <div className="col-10">
                              <MatDatepickerInput picker={picker} form={form} name="date_of_birth" className="form-control" placeholder="Choose a date" max={maxDate} invalid={form.errorState('date_of_birth')} />
                            </div>
                            <div className="col-2">
                              <MatDatepickerToggle picker={picker} matsuffix="" />
                              <MatDatepicker picker={picker} />
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <mat-label>Gender :</mat-label>
                          <MatRadioGroup {...form.bindValue('gender')}>
                            <MatRadioButton value="Male">Male</MatRadioButton>
                            <MatRadioButton value="Female">Female</MatRadioButton>
                          </MatRadioGroup>
                        </div>
                        <div className="col-md-4">
                          {form.hasError('age', 'required') && <MatError className="ml-2"> Age is required </MatError>}
                          {/* inline onKeyPress="if(this.value.length==3) return false;" (not an Angular binding) */}
                          <input
                            type="number"
                            onKeyPress={(e) => {
                              if (e.currentTarget.value.length == 3) e.preventDefault();
                            }}
                            {...form.bind('age', { type: 'number' })}
                            name="age"
                            placeholder="Age"
                            maxLength="3"
                            minLength="1"
                            max="100"
                            min="1"
                            className="form-control"
                          />
                        </div>
                        <div className="col-md-4 mb-3">
                          <MatInput type="text" className="form-control" {...form.bind('profession')} placeholder="Profession" invalid={form.errorState('profession')} />
                        </div>
                        <div className="col-md-12 aligncenter">
                          <button type="submit" disabled={saving} className="btn btn-login float-right" style={{ background: '#EF7E22', color: '#fff', fontWeight: 600, marginBottom: '40px' }}>
                            SUBMIT
                          </button>
                          <button type="button" onClick={() => form.reset()} className="btn btn-login float-right reset" style={{ background: '#EF7E22', color: '#fff', fontWeight: 600, marginRight: '10px' }}>
                            RESET
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
            {isLearnerPresent && (
              <div className="m-4">
                <table className="table table-striped table-hover">
                  <tbody>
                    {[
                      ['Name', 'name'],
                      ['Contact Number', 'phone'],
                      ['Email', 'email'],
                      ['Date of Birth', 'date_of_birth'],
                      ['Gender', 'gender'],
                      ['Profession', 'profession'],
                    ].map(([label, key]) => (
                      <tr key={key}>
                        <th scope="row">{label}</th>
                        <td> {learnerDetails?.[key]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="col-md-12 aligncenter">
                  <button type="submit" className="btn btn-login float-right" onClick={editLearnerDetails} style={{ background: '#EF7E22', color: '#fff', fontWeight: 600, marginBottom: '40px' }}>
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Scope>
  );
}
