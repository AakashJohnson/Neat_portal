'use client';
// Port of app/components/pages/feedback/feedback.component.{html,ts}
// grievanceService.submitFeedback (token attached by the BFF when logged in) → toastr.
import SiteChrome from '@/components/layout/SiteChrome';
import { MatRadioGroup, MatRadioButton } from '@/components/mat/MatRadio';
import { useFormGroup, Validators } from '@/lib/forms';
import { grievanceService } from '@/services';
import { subscribe } from '@/lib/api';
import { toastr } from '@/components/common/Toastr';

export default function FeedbackPage() {
  const form = useFormGroup({
    name: [null, [Validators.required]],
    email: [null, [Validators.required]],
    experience: [null, [Validators.required]],
    feedback: [null, [Validators.required]],
  });

  const onSubmit = (values) => {
    if (form.valid) {
      subscribe(grievanceService.submitFeedback(values), (data) => {
        if (data['message'] == 'Success') toastr.success(data['reason']);
        else toastr.error(data['reason']);
      });
    }
  };

  return (
    <SiteChrome after={
      <>
        <img src="img/feedback-img.png" alt="" />
      </>
    }>
      <div className="about-page-area section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title">
                  <h3 style={{ marginTop: "40px" }}>
                    Send us your Feedback
                  </h3>
                  <p>
                    Do you have a suggestion or found some bug?
                    <br />
                    {' '}Let us know in the field below.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-6 col-md-12 col-12">
              <div className="feedback-bg">
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form.value); }} noValidate>
                  <div className="form-group">
                    <h1>
                      Submit your feedback!
                    </h1>
                  </div>
                  <div className="form-group">
                    <input type="text" className="form-control" {...form.bind("name")} placeholder="Your Name" />
                  </div>
                  <div className="form-group">
                    <input type="email" className="form-control" {...form.bind("email")} placeholder="Your Email" />
                  </div>
                  <div className="form-group">
                    <h2>
                      How was your experience?
                    </h2>
                    <div className="row">
                      <MatRadioGroup aria-label="How was your experience ?" {...form.bindValue("experience")}>
                        <div className="col-4" style={{ color: "white" }}>
                          <MatRadioButton value="Good">
                            <b>
                              Good
                            </b>
                          </MatRadioButton>
                        </div>
                        <div className="col-4" style={{ color: "white" }}>
                          <MatRadioButton value="Fair">
                            <b>
                              Fair
                            </b>
                          </MatRadioButton>
                        </div>
                        <div className="col-4" style={{ color: "white" }}>
                          <MatRadioButton value="Bad">
                            <b>
                              Bad
                            </b>
                          </MatRadioButton>
                        </div>
                      </MatRadioGroup>
                    </div>
                  </div>
                  <div className="form-group">
                    <textarea {...form.bind("feedback")} className="form-control" rows="3" cols="50" name="feedback" placeholder="Describe your experience here..."></textarea>
                  </div>
                  <div className="form-group">
                    <button type="submit" className="btn btn-login" style={{ background: "#EF7E22", color: "#fff" }}>
                      Send Feedback
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

