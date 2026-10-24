'use client';
// $paginator->render() with resources/views/vendor/pagination/bootstrap-4
// .blade.php: « 1 2 … n », Laravel's UrlWindow (onEachSide = 3: the whole
// range up to 13 pages, otherwise first two + window + last two), current
// page as a span, other query-string parameters kept on the links.
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

function elements(current, last, onEachSide = 3) {
  const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
  const window = onEachSide * 2;
  if (last < window + 6) return [range(1, last)];
  if (current <= window) return [range(1, window + 2), '...', range(last - 1, last)];
  if (current > last - window) return [range(1, 2), '...', range(last - (window + 2), last)];
  return [range(1, 2), '...', range(current - onEachSide, current + onEachSide), '...', range(last - 1, last)];
}

/** @param {{ meta: { current_page: number, last_page: number } }} props  (DataArraySerializer meta) */
export default function Pagination({ meta }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (!meta || meta.last_page <= 1) return null;
  const { current_page: current, last_page: last } = meta;
  const url = (page) => {
    const q = new URLSearchParams(params.toString());
    q.set('page', String(page));
    return `${pathname}?${q.toString()}`;
  };
  return (
    <ul className="pagination">
      {current <= 1 ? (
        <li className="page-item disabled">
          <span className="page-link">&laquo;</span>
        </li>
      ) : (
        <li className="page-item">
          <Link className="page-link" href={url(current - 1)} rel="prev">
            &laquo;
          </Link>
        </li>
      )}
      {elements(current, last).map((el, i) =>
        typeof el === 'string' ? (
          <li key={`dots${i}`} className="page-item disabled">
            <span className="page-link">{el}</span>
          </li>
        ) : (
          el.map((page) =>
            page === current ? (
              <li key={page} className="page-item active">
                <span className="page-link">{page}</span>
              </li>
            ) : (
              <li key={page} className="page-item">
                <Link className="page-link" href={url(page)}>
                  {page}
                </Link>
              </li>
            ),
          )
        ),
      )}
      {current < last ? (
        <li className="page-item">
          <Link className="page-link" href={url(current + 1)} rel="next">
            &raquo;
          </Link>
        </li>
      ) : (
        <li className="page-item disabled">
          <span className="page-link">&raquo;</span>
        </li>
      )}
    </ul>
  );
}
