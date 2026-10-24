'use client';
// "Book Your Paid Seat" disclaimer modal (#bookYourPaidSeat), identical in the
// course-details and b2b-course-details templates.
import { forwardRef } from 'react';
import { dataToggleModal } from '@/components/bootstrap/bsModal';

const PaidSeatModal = forwardRef(function PaidSeatModal({ isChecked, setIsChecked, onSubmit }, ref) {
  return (
    <div ref={ref} className="modal fade" id="bookYourPaidSeat" tabIndex="-1" role="dialog" aria-labelledby="login-modal" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title login-title" id="login-modal">
              Disclaimer
            </h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <p>
              NEAT is an initiative of MoE (Implementing Agency AICTE) to provide a platform of leaning in upcoming and state of art technology areas through online courses being offered by
              industry. Solutions that Ed-Tech MoE/AICTE doesn&apos;t guarantee any employment.
            </p>
            {!isChecked && (
              <span style={{ color: 'red' }}>
                Please read these{' '}
                {/* #termsCondition does not exist: Bootstrap does nothing; routerLink [''] does not navigate. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- never navigates (preventDefault) */}
                <a href="/" data-toggle="modal" data-target="#termsCondition" style={{ color: 'red' }} onClick={(e) => dataToggleModal(e, '#termsCondition')}>
                  Terms and Conditions carefully
                </a>
              </span>
            )}
            {/* NgForm: novalidate, submit default prevented. */}
            <form noValidate onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <input type="checkbox" name="checkbox" checked={!!isChecked} onChange={(e) => setIsChecked(e.target.checked)} />
                <label className="form-check-label">I agree to the terms and conditions</label>
              </div>
              <div className="form-group ">
                <button onClick={onSubmit} type="submit" className="btn btn-login float-right" style={{ background: '#EF7E22', color: '#fff' }}>
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PaidSeatModal;
