// Route "company/home" → CompanyHomeComponent: static dashboard counters.
// The "Item" texts are leftovers of HTML comments that lost their markers.
const COUNTERS = [
  ['bg-violet', 'zmdi-book', ['Courses ', 'Offered'], '25%', '25', '65'],
  ['bg-red', 'zmdi-male-female', ['Registered ', 'Student'], '70%', '70', '970'],
  ['bg-green', 'zmdi-receipt', ['Registered ', 'Institutes'], '40%', '40', '120'],
  ['bg-orange', 'zmdi-accounts', ['Registered', ' Company'], '50%', '50', '150'],
];

export default function Page() {
  return (
    <section className="dashboard-counts no-padding-bottom">
      <div className="container-fluid">
        <div className="row bg-white has-shadow">
          {COUNTERS.map(([bg, icon, [l1, l2], width, now, number]) => [
            ' Item ',
            <div key={icon} className="col-xl-6 col-sm-6">
              <div className="item d-flex align-items-center">
                <div className={`icon ${bg}`}>
                  <i className={`zmdi ${icon}`}></i>
                </div>
                <div className="title">
                  <span>
                    {l1}
                    <br />
                    {l2}
                  </span>
                  <div className="progress">
                    <div role="progressbar" style={{ width, height: '4px' }} aria-valuenow={now} aria-valuemin="0" aria-valuemax="100" className={`progress-bar ${bg}`}></div>
                  </div>
                </div>
                <div className="number">
                  <strong>{number}</strong>
                </div>
              </div>
            </div>,
          ])}
        </div>
        <div className="row bg-white has-shadow">
          <div className="col-xl-12 col-sm-12">
            <div id="container"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
