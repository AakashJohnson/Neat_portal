'use client';
// One panel of the Bootstrap-3-style accordion on the course detail pages
// (Bootstrap 4.0 collapse with data-parent="#accordion"; "in" is a BS3 class
// with no effect in BS4, so every panel starts closed).
import { useBsCollapse } from '@/components/bootstrap/useBsCollapse';

export default function AccordionPanel({ n, title, triggerClass, ariaExpanded, ariaControls, collapseClass = 'panel-collapse collapse', children }) {
  const { target, trigger, toggle } = useBsCollapse({ parent: '#accordion' });
  return (
    <div className="panel panel-default">
      <div className="panel-heading" role="tab" id={`heading${n}`}>
        <h4 className="panel-title">
          <a
            ref={trigger}
            className={triggerClass}
            role="button"
            data-toggle="collapse"
            data-parent="#accordion"
            href={`#collapse${n}`}
            aria-expanded={ariaExpanded}
            aria-controls={ariaControls ?? `collapse${n}`}
            onClick={toggle}
          >
            {title}
          </a>
        </h4>
      </div>
      <div ref={target} id={`collapse${n}`} className={collapseClass} role="tabpanel" aria-labelledby={`heading${n}`}>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}
