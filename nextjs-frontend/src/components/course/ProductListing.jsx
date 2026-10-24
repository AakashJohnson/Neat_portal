'use client';
// Shared port of components/pages/course (B2C) and components/pages/b2b-course
// (B2B): identical templates/styles except the endpoints, the details route
// and the course logo block (B2B only).
// DEV-F02: href="javascript:void(0)" (blocked by React 19) is rendered as
// href="#" with preventDefault — same behaviour on click.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteChrome from '@/components/layout/SiteChrome';
import Scope from '@/components/common/Scope';
import SafeHtml from '@/components/common/SafeHtml';
import { companyService } from '@/services';
import { subscribe } from '@/lib/api';
import { fileUrl } from '@/lib/format';
import { slideToggle } from '@/lib/jquery';

const KINDS = {
  B2C: {
    scope: 'course',
    landing: companyService.getB2CProductsLandingPage,
    buckets: companyService.getB2CProductBuckets,
    bucketWise: companyService.getB2CBucketWiseProducts,
    search: companyService.getB2CBucketWiseSearchProducts,
    details: '/course-details/',
    logo: false,
  },
  B2B: {
    scope: 'b2b-course',
    landing: companyService.getB2BProductsLandingPage,
    buckets: companyService.getB2BProductBuckets,
    bucketWise: companyService.getB2BBucketWiseProducts,
    search: companyService.getB2BBucketWiseSearchProducts,
    details: '/b2b-course-details/',
    logo: true,
  },
};

export default function ProductListing({ kind }) {
  const k = KINDS[kind];
  const router = useRouter();
  const listRef = useRef(null);
  const [products, setProducts] = useState(undefined);
  const [buckets, setBuckets] = useState(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const handleProducts = (data) => setProducts(data['products']);

  useEffect(() => {
    let alive = true;
    subscribe(k.landing(), (data) => alive && setProducts(data['products']));
    subscribe(k.buckets(), (data) => alive && setBuckets(data['buckets']));
    return () => {
      alive = false;
    };
  }, [k]);

  const showProductDetails = (code) => {
    router.push(k.details + code);
    window.scroll(0, 0);
  };
  const bucketWise = (bucket) => subscribe(k.bucketWise(bucket), handleProducts);

  return (
    <SiteChrome>
      <Scope name={k.scope}>
        {/* feature_part start */}
        <section className="mainCntLstSec productListing">
          <div className="container">
            <div className="mainCntLstHdng"></div>
            <div className="mainCntLstSecIn">
              <div className="row">
                <div className="col-md-3 col-sm-3 col-xs-12 browsLst">
                  <div className="browsLstIn">
                    <div className="browsHdng" onClick={() => slideToggle(listRef.current, 'slow')}>
                      <h1>
                        <i className="fa fa-list-ul" aria-hidden="true"></i> Select Category
                      </h1>
                    </div>
                    <div className="browsLstCnt" ref={listRef}>
                      <ul>
                        <li>
                          <a href="#" onClick={(e) => { e.preventDefault(); bucketWise('All'); }}>
                            All Courses
                          </a>
                        </li>
                        {(Array.isArray(buckets) ? buckets : []).map((bucketsList, i) => (
                          <li key={i}>
                            <a href="#" onClick={(e) => { e.preventDefault(); bucketWise(bucketsList?.product_bucket); }}>
                              {bucketsList?.product_bucket}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="col-md-9 col-sm-9 col-xs-12 browsRgt">
                  <div className="prdctLstHdng">
                    <h2>All Courses </h2>
                    {/* Search form positioned next to the heading */}
                    <div className="search-form-container">
                      <input type="text" placeholder="Search Courses/ Institutes" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                      <button onClick={() => subscribe(k.search(searchQuery), handleProducts)} className="search-btn">
                        <i className="fa fa-search" aria-hidden="true"></i> Search
                      </button>
                    </div>
                  </div>
                  <div className="topmainLstPrdct scrollbar" id="style-3">
                    <div className="force-overflow">
                      <div className="internshipMainDivHmcar">
                        {(Array.isArray(products) ? products : []).map((product, i) => (
                          <div className="col-md-4 col-sm-2 col-xs-12 lstCat" key={i}>
                            <div className="lstCatIn">
                              {/* [routerLink]="" renders href="null"; the click handler navigates. */}
                              <a href="null" onClick={(e) => { e.preventDefault(); showProductDetails(product?.code); }}>
                                {k.logo && (
                                  <div className="CatInImg">
                                    <img src={fileUrl(`files/course_logo/${product?.course_logo_file}`)} />
                                  </div>
                                )}
                                <div className="lstHdngCnt">
                                  <div className="lLgoHdng">
                                    <div className="lLgoHd">{product?.company_name}</div>
                                  </div>
                                </div>
                                <div className="lstCatTxt">
                                  <h2>{product?.course_name}</h2>
                                  <SafeHtml as="p" className="text-overlap" html={product?.product_highlights} />
                                </div>
                                <div className="lstCatBtn">
                                  <span className="knwMoreBtn">
                                    View Program <i className="fa fa-long-arrow-right" aria-hidden="true"></i>
                                  </span>
                                </div>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* upcoming_event part start */}
      </Scope>
    </SiteChrome>
  );
}
