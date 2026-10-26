'use client';


import { useRouter, useSearchParams } from 'next/navigation';
import MatIcon from '@/components/mat/MatIcon';
import MatTooltip from '@/components/mat/MatTooltip';
import { jarwisService } from '@/services';
import { subscribe } from '@/lib/api';
import { useFormGroup, Validators } from '@/lib/forms';


const PASSWORD_PATTERN = '(?=^.{6,}$)(?=.*[0-9])(?![.\n])(?=.*[@!#$%^&*-+:;_=,.<>~`/()\\[\\{}])(?=.*[A-Z])(?=.*[a-z]).*$';
const CONFIRMATION_PATTERN = '(?=^.{6,}$)(?=.*[0-9])(?![.\n])(?=.*[@!#$%^&*-+:;_=,.<>~`/])(?=.*[A-Z])(?=.*[a-z]).*$';
const HINT = 'Password must contain at least a number, lowercase, uppercase and one special character. White spaces are not allowed.';

export default function ResetPasswordForm({ variant = 'page' }) {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? undefined;
  const form = useFormGroup({
    email: [null, [Validators.required, Validators.email]],
    password: [null, [Validators.required, Validators.pattern(PASSWORD_PATTERN), Validators.minLength(8)]],
    password_confirmation: [null, [Validators.required, Validators.pattern(CONFIRMATION_PATTERN)]],
    token: [null],
  });

  const onSubmit = (values) => {
    values['token'] = token;
    subscribe(jarwisService.changePassword(values), (data) => {
      alert(data['data']);
      router.push('/login');
    });
  };

  return (
    <form
      noValidate
      className=" form-horizontal "
      onSubmit={(e) => {
        e.preventDefault();
        form.markSubmitted();
        onSubmit({ ...form.value });
      }}
    >
      <div className="form-group ">
        <input type="email" className="form-control" placeholder="Enter Email" {...form.bind('email')} name="email" id="inputEmail3 " required autoComplete="off " />
      </div>
      <div className="form-group ">
        <div className="row">
          <div className="form-group col-10">
            <input type="password" className="form-control" minLength="8" placeholder="Enter password" {...form.bind('password')} name="registerpassword" required />
          </div>
          <div className="col-1">
            <MatTooltip message={HINT} position="right">
              <MatIcon style={{ marginTop: '9px' }} matsuffix="" mattooltipposition="right" mattooltip={HINT}>
                info
              </MatIcon>
            </MatTooltip>
          </div>
        </div>
      </div>
      <div className="form-group ">
        <input type="password" className="form-control" placeholder="Confirm Password" {...form.bind('password_confirmation')} name="password_confirmation" id="inputPassword4" required />
      </div>
      {variant === 'page' ? (
        <div className="form-group">
          <button type="submit" className="btn btn-login float-right" disabled={!form.valid}>
            Change Password
          </button>
        </div>
      ) : (
        <div>
          <button type="submit" className="btn button-submit" disabled={!form.valid}>
            Change Password
          </button>
        </div>
      )}
    </form>
  );
}
