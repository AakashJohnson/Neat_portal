'use client';
// Port of components/pages/banner-message/banner-message.component.{html,ts}
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { companyService } from '@/services';

export default function BannerMessage() {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    companyService.getHomePageCounter().then((res) => setCounts(res.data ?? {}));
  }, []);

  return (
    <>
      <section className="learning_part abtNeatSec">
        <div className="container">
          <div className="row align-items-sm-center align-items-lg-stretch">
            <div className="col-md-7 col-lg-7 abtNeatImg">
              <div className="learning_img">
                <img src="/assets/img/aicteBuilding.png" alt="" />
              </div>
            </div>
            <div className="col-md-5 col-lg-5 abtNeatCnt">
              <div className="learning_member_text">
                <h5>About NEAT</h5>
                <p>
                  Ministry of Education has announced a National Educational Alliance for Technology (NEAT) as a Public-Private partnership model between the Government (through its implementing agency AICTE) and the Education Technology companies of India. Through an open invitation and screening, companies are invited to showcase their products on a National Portal developed for the learners, who may procure them based on their requirements...
                </p>
                <Link href="/aboutNeat" className="btn_1">
                  Read More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="member_counter">
        <div className="container">
          <div className="row">
            {[
              [counts.products, 'Products'],
              [counts.regStud, 'Registered Students'],
              [counts.regLear, 'Registered Learners'],
              [counts.regInst, 'Ed-Tech Companies'],
            ].map(([value, label]) => (
              <div className="col-lg-3 col-sm-6" key={label}>
                <div className="single_member_counter">
                  <span className="counter">{value}</span>
                  <h4>{label}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
