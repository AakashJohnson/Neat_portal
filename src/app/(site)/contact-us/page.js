'use client';
// Port of app/components/pages/contact-us/contact-us.component.{html,ts}
// grievanceService.submitContactUs → toastr with the API reason.
import SiteChrome from '@/components/layout/SiteChrome';
import { grievanceService } from '@/services';
import { subscribe } from '@/lib/api';
import { useFormGroup, Validators } from '@/lib/forms';
import { toastr } from '@/components/common/Toastr';

export default function ContactUsPage() {
  const form = useFormGroup({
    name: [null, [Validators.required]],
    email: [null, [Validators.required]],
    message: [null, [Validators.required]],
  });

  const onSubmit = (values) => {
    if (form.valid) {
      subscribe(grievanceService.submitContactUs(values), (data) => {
        if (data['message'] == 'Success') toastr.success(data['reason']);
        else toastr.error(data['reason']);
      });
    }
  };

  return (
    <SiteChrome>
      <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3505.130329898125!2d77.15218461558574!3d28.535802082456105!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfd3522132487%3A0x5decdf23b12670c3!2sAll%20India%20Council%20For%20Technical%20Education!5e0!3m2!1sen!2sin!4v1574062208854!5m2!1sen!2sin" width="100%" height="320" frameBorder="0" style={{ border: "0" }} allowFullScreen></iframe>
      <section className="login-block contatUsSec">
        <div className="container">
          <div className="row">
            <div className="col-md-6 banner-sec">
              <div className="login-sec">
                <div className="cntInfoDiv">
                  <h2 className="">
                    CONTACT INFO
                  </h2>
                  <ul>
                    <li>
                      <i className="fa fa-phone" aria-hidden="true"></i>
                      {' '}011-29581423
                    </li>
                    <li>
                      <i className="fa fa-envelope" aria-hidden="true"></i>
                      {' '}neat@aicte-india.org
                    </li>
                    <li>
                      <i className="fa fa-map-marker" aria-hidden="true"></i>
                      {' '}Nelson Mandela Marg, Vasant Kunj, New Delhi-110070
                    </li>
                  </ul>
                </div>
                <div className="cntInfoDiv socialMdaDiv">
                  <h2 className="">
                    SOCIAL MEDIA
                  </h2>
                  <a href="https://www.facebook.com/officialaicte/" target="_blank" className="fbScl">
                    <i className="fa fa-facebook-square" aria-hidden="true"></i>
                  </a>
                  <a href="https://twitter.com/AICTE_INDIA?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor" target="_blank" className="twScl">
                    <i className="fa fa-twitter-square" aria-hidden="true"></i>
                  </a>
                  <a href="https://www.instagram.com/explore/tags/aicte/top/?hl=en" target="_blank" className="insScl">
                    <i className="fa fa-instagram" aria-hidden="true"></i>
                  </a>
                </div>
              </div>
            </div>
            <div className="col-md-6 login-sec">
              <div className="sendMsgDiv">
                <h2 className="">
                  SEND YOUR MESSAGE
                </h2>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form.value); }} noValidate className="login-form">
                  <div className="form-group">
                    <input type="text" className="form-control" {...form.bind("name")} placeholder="Name" />
                  </div>
                  <div className="form-group">
                    <input type="text" className="form-control" {...form.bind("email")} placeholder="Email" />
                  </div>
                  <div className="form-group">
                    <textarea className="form-control textArea" {...form.bind("message")} placeholder="Message"></textarea>
                  </div>
                  <div className="form-check">
                    <button type="submit" className="btn btn-login float-right">
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}

