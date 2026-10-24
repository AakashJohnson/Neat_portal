// Shared markup of payment-success and payment-failure (identical templates
// apart from the title, icon and texts).
import Link from 'next/link';
import SiteChrome from '@/components/layout/SiteChrome';

export default function PaymentResult({ title, icon, heading, children }) {
  return (
    <SiteChrome>
      {/* Course Details Area Start */}
      <div className="course-details-area section-padding" style={{ textAlign: 'center' }}>
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title">
                  <h3 style={{ marginTop: '40px' }}>{title}</h3>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12">
              <table className="table table-bordered">
                <tbody></tbody>
              </table>
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <td colSpan="2" className="aligncenter">
                      <i className={icon}></i>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" className="aligncenter">
                      <h1>{heading}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" className="aligncenter">
                      {children}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" className="aligncenter">
                      <Link href="/" className="org-button">
                        Back To Home
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}
