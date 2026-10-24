// Port of components/users/student/platform/platform.component.{html,ts} (inside the student shell).

export default function StudentPlatformPage() {
  return (
    <>
    {/* Breadcrumb Banner Area Start */}
    <div className="breadcrumb-banner-area">
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="breadcrumb-text">
              <div className="breadcrumb-bar">
                <ul className="breadcrumb text-center">
                  <li>
                    <a href="index.html">
                      Home
                    </a>
                  </li>
                  <li>
                    Platform
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Breadcrumb Banner Area Start */}
    {/* Course Details Area Start */}
    <div className="course-details-area section-padding">
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="section-title-wrapper">
              <div className="section-title">
                <h3>
                  Platform
                </h3>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12">
            <table className="table table-bordered">
              <tbody />
            </table>
            <table className="table table-bordered">
              <tbody>
                <tr>
                  <td className="aligncenter">
                    <img src="/assets/img/neat-logo-platform.png" />
                  </td>
                  <td className="aligncenter">
                    <img src="/assets/img/hcl-logo.png" />
                  </td>
                </tr>
                <tr>
                  <td colSpan="3" className="aligncenter">
                    <img src="/assets/img/how_to_use_it.gif" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    {/* End of Course Details Area */}
    </>
  );
}

