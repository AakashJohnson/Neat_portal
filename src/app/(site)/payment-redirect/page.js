'use client';
// Port of components/pages/payment-redirect/payment-redirect.component.{html,ts}
// (login required, see proxy.js). Reads the product code and quantity handed
// over through DataService (in-memory: "default message"/1 after a reload),
// calls applyForPaidCourse and follows redirect_url with a full page load.
import { useNgOnInit } from '@/lib/useNgOnInit';
import { courseService } from '@/services';
import { subscribe } from '@/lib/api';
import { dataService } from '@/lib/dataService';
import { toastr } from '@/components/common/Toastr';

export default function PaymentRedirectPage() {
  useNgOnInit(() => {
    const productCode = { code: dataService.get('productCodeForPayment'), quantity: dataService.get('quantity') };
    subscribe(courseService.applyForPaidCourse(productCode), (data) => {
      if (data['message'] == 'Success') window.location.assign(data['redirect_url']);
      else toastr.error('Some Error Occured');
    });
  });

  return (
    <table className="table table-bordered" style={{ textAlign: 'center' }}>
      <tbody>
        <tr>
          <td colSpan="2" className="aligncenter" style={{ verticalAlign: 'middle' }}>
            <img src="/assets/images/processing-icon.png" />
            <span className="processing">Processing...</span>
          </td>
        </tr>
        <tr>
          <td colSpan="2" className="aligncenter">
            <h6>Please do not refresh the page or click the &quot;Back&quot; or &quot;Close&quot; button of your browser.</h6>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
