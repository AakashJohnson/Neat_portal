'use client';
// Port of components/pages/article/article.component.{html,ts}:
// grievanceService.getDetailArticle(id); articles shown when message == 'Success'.
import { use, useEffect, useState } from 'react';
import SiteChrome from '@/components/layout/SiteChrome';
import SafeHtml from '@/components/common/SafeHtml';
import { grievanceService } from '@/services';
import { subscribe } from '@/lib/api';

export default function ArticlePage({ params }) {
  const { id } = use(params);
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    let alive = true;
    subscribe(grievanceService.getDetailArticle(id), (data) => {
      if (alive && data.message == 'Success') setArticles(data['articles']);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <SiteChrome>
      <section className="learning_part abtNeatSec">
        <div className="container">
          <div className="row align-items-sm-center align-items-lg-stretch">
            <div className="col-md-12 col-lg-12 abtNeatCnt">
              {(Array.isArray(articles) ? articles : []).map((article, i) => (
                <div className="learning_member_text" key={i}>
                  <h2>{article?.title}</h2>
                  <SafeHtml as="p" html={article?.description} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
