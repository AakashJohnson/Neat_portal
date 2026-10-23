'use client';
// Port of components/pages/highlights/highlights.component.{html,ts}:
// category list + searchable product grid on the home page.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { companyService } from '@/services';
import { fileUrl } from '@/lib/format';
import SafeHtml from '@/components/common/SafeHtml';
import Scope from '@/components/common/Scope';

export default function Highlights() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [listOpen, setListOpen] = useState(true);
  const leftPanel = useRef(null);
  const leftContent = useRef(null);
  const rightContent = useRef(null);

  // setEqualPanelHeight(): left list ≥ 650 px; right grid 32 px shorter, both scrollable.
  const setEqualPanelHeight = useCallback(() => {
    const lp = leftPanel.current;
    const lc = leftContent.current;
    const rc = rightContent.current;
    if (!lp || !lc || !rc) return;
    const commonHeight = Math.max(lp.scrollHeight, 650);
    const rightHeight = Math.max(lp.scrollHeight - 32, 200);
    Object.assign(lc.style, { height: `${commonHeight}px`, maxHeight: `${commonHeight}px`, overflowY: 'auto' });
    Object.assign(rc.style, { height: `${rightHeight}px`, maxHeight: `${rightHeight}px`, overflowY: 'auto' });
  }, []);

  const handleProducts = useCallback(
    (res) => {
      setProducts(res.data?.products ?? []);
      setTimeout(setEqualPanelHeight, 100);
    },
    [setEqualPanelHeight],
  );

  useEffect(() => {
    companyService.getProductsLandingPage().then(handleProducts);
    companyService.getProductBuckets().then((res) => {
      setBuckets(res.data?.buckets ?? []);
      setTimeout(setEqualPanelHeight, 100);
    });
    const onResize = () => setTimeout(setEqualPanelHeight, 100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [handleProducts, setEqualPanelHeight]);

  const showProductDetails = (code, prodtype) => {
    router.push(prodtype === 'B2C' ? `/course-details/${code}` : `/b2b-course-details/${code}`);
    window.scroll(0, 0);
  };

  return (
    <Scope name="highlights">
    <section className="mainCntLstSec">
      <div className="container">
        <div className="mainCntLstHdng"></div>
        <div className="mainCntLstSecIn">
          <div className="row">
            <div className="col-md-3 col-sm-3 col-xs-12 browsLst">
              <div className="browsLstIn" ref={leftPanel}>
                <div
                  className="browsHdng"
                  onClick={() => {
                    setListOpen((o) => !o);
                    setTimeout(setEqualPanelHeight, 600);
                  }}
                >
                  <h1>
                    <i className="fa fa-list-ul" aria-hidden="true"></i> Select Category
                  </h1>
                </div>
                <div className="browsLstCnt" ref={leftContent} style={listOpen ? undefined : { display: 'none' }}>
                  <ul>
                    <li>
                      <a href="#" onClick={(e) => { e.preventDefault(); companyService.getBucketWiseProducts('All').then(handleProducts); }}>
                        All Courses
                      </a>
                    </li>
                    {buckets.map((b, i) => (
                      <li key={i}>
                        <a href="#" onClick={(e) => { e.preventDefault(); companyService.getBucketWiseProducts(b?.product_bucket).then(handleProducts); }}>
                          {b?.product_bucket}
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
                <div className="search-form-container">
                  <input type="text" placeholder="Search Courses/ Institutes" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                  <button onClick={() => companyService.getBucketWiseSearchProducts(searchQuery).then(handleProducts)} className="search-btn">
                    <i className="fa fa-search" aria-hidden="true"></i> Search
                  </button>
                </div>
                <span className="viewall">
                  <Link href="/course">
                    View All <i className="fa fa-long-arrow-right" aria-hidden="true"></i>
                  </Link>
                </span>
              </div>
              <div className="topmainLstPrdct scrollbar" id="style-3" ref={rightContent}>
                <div className="force-overflow">
                  <div className="internshipMainDivHmcar">
                    {products.map((product, i) => (
                      // Index key: the listing can contain the same product twice (join duplicates), as in Angular.
                      <div className="col-md-4 col-sm-2 col-xs-12 lstCat" key={i}>
                        <div className="lstCatIn">
                          <a href="#" onClick={(e) => { e.preventDefault(); showProductDetails(product?.code, product?.product_type); }}>
                            <div className="CatInImg">
                              {/* No alt, as in the original: a missing logo shows the browser's broken-image box. */}
                              {/* eslint-disable-next-line jsx-a11y/alt-text */}
                              <img src={fileUrl(`files/course_logo/${product?.course_logo_file}`)} />
                            </div>
                            <div className="lstHdngCnt">
                              <div className="lLgoHdng">
                                <div className="lLgoHd">{product?.company_name}</div>
                              </div>
                            </div>
                            <div className="lstCatTxt">
                              <h2>{product?.course_name}</h2>
                              <SafeHtml className="text-overlap" html={product?.product_highlights} />
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
    </Scope>
  );
}
