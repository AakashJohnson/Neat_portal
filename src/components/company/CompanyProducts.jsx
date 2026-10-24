'use client';
// Port of components/users/company/company-products (the company shell's
// default child and "products"): the company's products as cards; image or
// name → company/form/:code. [className]="modeClass" replaces the section's
// static classes with 'Light'.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Scope from '@/components/common/Scope';
import MatProgressSpinner from '@/components/mat/MatProgressSpinner';
import { useSession } from '@/components/providers/SessionProvider';
import { companyService } from '@/services';
import { subscribe } from '@/lib/api';
import { fileUrl } from '@/lib/format';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function CompanyProducts() {
  const router = useRouter();
  const { claims, ready, legacyDecodable } = useSession();
  const [products, setProducts] = useState(undefined);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(true);

  useNgOnInit(() => {
    if (!legacyDecodable || !claims) return; // the inline atob decode throws
    const company = { email: claims['email'], user_id: claims['user_id'], uuid: claims['uuid'], application_number: claims['application_number'] };
    subscribe(companyService.getProducts(company), (data) => {
      setShowLoadingSpinner(false);
      setProducts(data['products']);
    });
  }, ready);

  const submitProductForm = (code) => router.push('/company/form/' + code);

  return (
    <Scope name="company-products">
      {showLoadingSpinner && (
        <div className="loading-indicator">
          <MatProgressSpinner />
        </div>
      )}
      <section className="Light">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="section-title-wrapper">
                <div className="section-title">
                  <h3 style={{ marginTop: '40px' }}>Company Products</h3>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            {(products ?? []).map((product, i) => (
              <div key={i} className="col-xl-3 col-sm-6 mb-3">
                <div className="card custom">
                  <div className="card-header aligncenter ">
                    <img src={fileUrl(`files/course_logo/${product?.course_logo_file ?? ''}`)} onClick={() => submitProductForm(product.code)} />
                  </div>
                  <div className="card-body aligncenter">
                    <h3 className="h4" onClick={() => submitProductForm(product.code)}>
                      {product.name}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Scope>
  );
}
