'use client';


import Link from 'next/link';
import { useEffect, useState } from 'react';
import { grievanceService } from '@/services';
import Carousel from '@/components/common/Carousel';
import Scope from '@/components/common/Scope';


function Marquee({ children }) {
  return (
    <marquee behavior="scroll" direction="up" scrollamount="3" onMouseOver={(e) => e.currentTarget.stop?.()} onMouseOut={(e) => e.currentTarget.start?.()}>
      {children}
    </marquee>
  );
}

const GALLERY = [
  ['carousel-example-captions', 'g01.jpg', 'g09.jpg'],
  ['carousel-example-captions2', 'g02.jpg', 'g10.jpg'],
  ['carousel-example-captions3', 'g03.jpg', 'g11.jpg'],
  ['carousel-example-captions4', 'g04.jpg', 'g12.jpg'],
  ['carousel-example-captions5', 'g05.jpg', 'g13.jpg'],
];

export default function Announcement() {
  const [data, setData] = useState({ news: [], announcements: [], articles: [] });
  useEffect(() => {
    grievanceService.getAnnouncements().then((res) =>
      setData({ news: res.data?.news ?? [], announcements: res.data?.announcements ?? [], articles: res.data?.articales ?? [] }),
    );
  }, []);

  return (
    <Scope name="announcement">
      <section className="advance_feature learning_part">
        <div className="container">
          <div className="row align-items-sm-center align-items-xl-stretch">
            <div className="col-lg-5 col-md-5">
              <div className="learning_img">
                <img src="/assets/img/newAnnoucement.png" alt="" />
              </div>
            </div>
            <div className="col-md-7 col-lg-7">
              <div className="learning_member_text">
                <h5>Articles/Accouncements</h5>
                <div className="row">
                  <div className="col-sm-6 col-md-12 col-lg-6 newsMainDiv">
                    <div className="learning_member_text_iner">
                      <span className="newsIcnS">
                        <i className="fa fa-newspaper-o" aria-hidden="true"></i>
                      </span>
                      <h4>Articles</h4>
                      <div>
                        <div>
                          <Marquee>
                            {                                                                 }
                            {data.news.map((n, i) => (
                              <div className="news-block" key={i}>
                                {data.articles.map((article) => (
                                  <div className="titlelist" key={article.id}>
                                    <Link href={`/article/${article.id}`} className="text-justify">
                                      {article.title}
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </Marquee>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-6 col-md-12 col-lg-6 anncnmtMainDiv">
                    <div className="learning_member_text_iner">
                      <span className="newsIcnS">
                        <i className="fa fa-volume-up" aria-hidden="true"></i>
                      </span>
                      <h4>Announcements</h4>
                      <div>
                        <div>
                          <Marquee>
                            {data.announcements.map((a) => (
                              <div className="news-block" key={a.id}>
                                <small>{a.created_at}</small>
                                <p className="text-justify">{a.title}</p>
                              </div>
                            ))}
                          </Marquee>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="photoGalrySec">
        <div className="container-fluid">
          <div className="photoGalryIn">
            <div className="section_tittle text-center">
              <h2>Photo Gallery</h2>
            </div>
            <div className="photoGalCntDiv">
              <ul>
                {GALLERY.map(([id, a, b]) => (
                  <li key={id}>
                    <Carousel id={id} innerProps={{ role: 'listbox' }} slides={[<img key="a" src={`/assets/img/${a}`} alt="" />, <img key="b" src={`/assets/img/${b}`} alt="" />]} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="socialMediaSec">
        <div className="container">
          <div className="socialThreeDiv">
            <div className="row">
              <div className="col-md-4 col-xs-12 _fbDiv">
                <div className="_fbDivIn">
                  <div className="fbHdngDiv">
                    <h2>Facebook</h2>
                  </div>
                  <div className="fbDivCnt">
                    <iframe
                      title="AICTE on Facebook"
                      src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FOfficialAICTE%2F&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId"
                      width="100%"
                      height="450"
                      style={{ border: 'none', overflow: 'hidden' }}
                      scrolling="no"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    ></iframe>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-xs-12 _twtrDiv">
                <div className="_fbDivIn">
                  <div className="fbHdngDiv">
                    <h2>Twitter</h2>
                  </div>
                  <div className="fbDivCnt">
                    <blockquote className="twitter-tweet" data-lang="en" style={{ margin: '0px' }}>
                      <a className="twitter-timeline" data-width="100%" data-height="450" href="https://twitter.com/AICTE_INDIA">
                        Tweets by AICTE_INDIA
                      </a>
                    </blockquote>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-xs-12 _fbDiv _youtbDiv">
                <div className="_fbDivIn">
                  <div className="fbHdngDiv">
                    <h2>Youtube</h2>
                  </div>
                  <div className="fbDivCnt">
                    <iframe
                      title="NEAT on YouTube"
                      width="100%"
                      height="450"
                      src="https://www.youtube.com/embed/mca80J-Ilag?controls=0"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
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
