'use client';
// Port of components/pages/register/register.component.{html,ts}.
// Validators include the ones Angular derived from template attributes
// (`required`, `minlength="10"`, `maxlength="10"` on formControlName inputs).
// The stray <option value="Select Role"> inside <mat-select> is projected into
// the panel as plain content (not selectable), as in Material.
import Link from 'next/link';
import { useState } from 'react';
import SiteChrome from '@/components/layout/SiteChrome';
import AuthBanner from '@/components/auth/AuthBanner';
import { MatSelect, MatOption } from '@/components/mat/MatSelect';
import { toastr } from '@/components/common/Toastr';
import { jarwisService } from '@/services';
import { apiErrorMessage, subscribe } from '@/lib/api';
import { useFormGroup, Validators } from '@/lib/forms';

const charCode = (evt) => (evt.which ? evt.which : evt.keyCode);
const isNumberKey = (evt) => charCode(evt) >= 48 && charCode(evt) <= 57;
const isSpace = (evt) => charCode(evt) != 32;

export default function RegisterPage() {
  const form = useFormGroup({
    username: [null, [Validators.required]],
    email: [null, [Validators.required, Validators.email]],
    password: [null, [Validators.required]],
    password_confirmation: [null, [Validators.required]],
    phone: [null, [Validators.required, Validators.maxLength(10), Validators.minLength(10)]], // + template minlength
    role_id: [null, [Validators.required]],
    permanent_institute_id: [null],
    college_name: [null],
    admission_number: [null],
  });
  const [selectedRole, setSelectedRole] = useState(undefined);
  const [selectedRole1, setSelectedRole1] = useState(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  // getSelectedRole() after the control value changed (new value passed in).
  const getSelectedRole = (role) => {
    setSelectedRole(role === 'Institute');
    setSelectedRole1(role === 'Student');
    form.setValidators('permanent_institute_id', role === 'Institute' ? [Validators.required] : null);
    form.setValidators('admission_number', role === 'Student' ? [Validators.required] : null);
    form.setValidators('college_name', role === 'Student' ? [Validators.required] : null);
  };

  const onSubmit = async (values) => {
    if (submitting) return;
    if (!form.valid) {
      toastr.error('Please Fill all the details');
      return;
    }
    if (values['role_id'] == 'Select Role') {
      toastr.error('Please Select a Valid Role');
      document.getElementById('role_id')?.focus();
      return;
    }
    setSubmitting(true);
    setNotice('');
    await subscribe(
      jarwisService.signUp(values),
      (data) => {
        if (data?.message === 'Error') {
          toastr.error(apiErrorMessage({ data }));
        } else if (!data.requires_email_confirmation) {
          setNotice('Registered successfully. You can now log in.');
          toastr.success('Registered successfully. You can now log in.');
        } else if (data.email_delivery === 'sent') {
          setNotice('Registered successfully. Check your email for the verification link.');
          toastr.success('Registered successfully. Check your email for verification.');
        } else {
          const message = 'Your account is saved, but the verification email was not delivered. Contact support to check the mail configuration, then resend the link from the login page.';
          setNotice(message);
          toastr.warning(message);
        }
      },
      (res) => {
        const message = apiErrorMessage(res);
        setNotice(message);
        toastr.error(message);
      },
    );
    setSubmitting(false);
  };

  const keyFilter = (filter) => (e) => {
    if (filter(e) === false) e.preventDefault();
  };

  return (
    <SiteChrome>
      <section className="login-block">
        <div className="container">
          <div className="row">
            <AuthBanner />
            <div className="col-md-6 login-sec">
              <h2 className="text-center">Register Now</h2>
              {notice && <p role="status">{notice}</p>}
              <form
                className="login-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  form.markSubmitted();
                  onSubmit(form.value);
                }}
              >
                <div className="form-group">
                  <label htmlFor="exampleInputPassword1" className="text-uppercase">
                    Select Role
                  </label>
                  <MatSelect
                    className="form-control"
                    id="role_id"
                    name="role_id"
                    placeholder="Select role"
                    required
                    {...form.bindValue('role_id')}
                    invalid={form.errorState('role_id')}
                    onSelectionChange={(value) => getSelectedRole(value)}
                  >
                    <option value="Select Role">Select Role: </option>
                    <MatOption value="Student">Student</MatOption>
                    <MatOption value="Institute">Institute</MatOption>
                    <MatOption value="Learner">Learner</MatOption>
                  </MatSelect>
                </div>
                <div className="form-group">
                  <input type="text" className="form-control" id="name" placeholder="Enter Full Name" {...form.bind('username')} name="name" required />
                </div>
                {selectedRole && <p>AISHE code and other institute details are collected in your institute profile after login.</p>}
                {selectedRole && (
                  <div className="form-group">
                    <input type="text" className="form-control" id="permanent_institute_id" placeholder="Permanent Institute Id" {...form.bind('permanent_institute_id')} name="permanent_institute_id" />
                  </div>
                )}
                {selectedRole1 && (
                  <div className="form-group">
                    <input type="text" className="form-control" id="code" placeholder="College Name" {...form.bind('college_name')} name="college_name" />
                  </div>
                )}
                {selectedRole1 && (
                  <div className="form-group">
                    <input type="text" className="form-control" id="code" placeholder="Admission Number" {...form.bind('admission_number')} name="admission_number" />
                  </div>
                )}
                <div className="form-group">
                  <input type="text" className="form-control" id="phone" placeholder="Enter Contact Number" {...form.bind('phone')} name="phone" onKeyPress={keyFilter(isNumberKey)} minLength="10" maxLength="10" required />
                </div>
                <div className="form-group">
                  <input type="email" className="form-control" id="email" placeholder="Enter email. e.g. abc@gmail.com" {...form.bind('email')} name="email" onKeyPress={keyFilter(isSpace)} required />
                </div>
                <div className="form-group">
                  <input type="password" className="form-control" id="password" placeholder="Enter password" {...form.bind('password')} name="password" required />
                  <small>Password must contain at least a number, lowercase, uppercase and one special character. White spaces are not allowed.</small>
                </div>
                <div className="form-group">
                  <input type="password" className="form-control" id="password_confirmation" placeholder="Enter password again" {...form.bind('password_confirmation')} name="password_confirmation" required />
                </div>
                <div className="form-check">
                  <label className="form-check-label fgPwLbl">
                    <Link href="/forgot-password" className="fgpw">
                      Forgot password?{' '}
                    </Link>
                    <Link href="/login" className="lstEml">
                      Login
                    </Link>
                  </label>
                  <button type="submit" disabled={submitting} className="btn btn-login float-right" style={{ marginTop: '0px', marginBottom: '10px' }}>
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
