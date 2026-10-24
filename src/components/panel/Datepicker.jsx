'use client';
// $('#birthday').datepicker({ orientation: 'bottom', startView: 'years',
// format: 'yyyy-mm-dd' }) — bootstrap-datepicker 1.x (styles in vendor.css):
// the dropdown opens on focus in the years (decade) view; a year opens its
// months, a month its days, a day fills the input and closes it.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_MIN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n) => String(n).padStart(2, '0');
const parse = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? '');
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
};

function Head({ label, onPrev, onNext, onSwitch, colspan = 5 }) {
  return (
    <thead>
      <tr>
        <th colSpan="7" className="datepicker-title" style={{ display: 'none' }}></th>
      </tr>
      <tr>
        <th className="prev" onClick={onPrev}>
          «
        </th>
        <th colSpan={colspan} className="datepicker-switch" onClick={onSwitch}>
          {label}
        </th>
        <th className="next" onClick={onNext}>
          »
        </th>
      </tr>
    </thead>
  );
}

const Foot = () => (
  <tfoot>
    <tr>
      <th colSpan="7" className="today" style={{ display: 'none' }}>
        Today
      </th>
    </tr>
    <tr>
      <th colSpan="7" className="clear" style={{ display: 'none' }}>
        Clear
      </th>
    </tr>
  </tfoot>
);

export default function Datepicker({ name, id, defaultValue = '', className }) {
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('years');
  // The input's value as last read in an event handler (it is uncontrolled, like the plugin's input).
  const [value, setValue] = useState(defaultValue);
  const [cursor, setCursor] = useState(() => parse(defaultValue) ?? new Date());
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open) return;
    const r = input.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX });
    const close = (e) => {
      if (!input.current?.contains(e.target) && !e.target.closest?.('.datepicker-dropdown')) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const y = cursor.getUTCFullYear();
  const m = cursor.getUTCMonth();
  const decade = Math.floor(y / 10) * 10;
  const sel = open ? parse(value) : null;
  const move = (years, months = 0) => setCursor(new Date(Date.UTC(y + years, m + months, 1)));

  const setInput = (text) => {
    input.current.value = text;
    setValue(text);
    setOpen(false);
  };
  const pick = (day) => setInput(`${y}-${pad(m + 1)}-${pad(day)}`);

  let body;
  if (view === 'years') {
    body = (
      <div className="datepicker-years" style={{ display: 'block' }}>
        <table className="table-condensed">
          <Head label={`${decade}-${decade + 9}`} onPrev={() => move(-10)} onNext={() => move(10)} onSwitch={() => {}} />
          <tbody>
            <tr>
              <td colSpan="7">
                {Array.from({ length: 12 }, (_, i) => decade - 1 + i).map((year) => (
                  <span
                    key={year}
                    className={`year${year < decade ? ' old' : year > decade + 9 ? ' new' : ''}${sel?.getUTCFullYear() === year ? ' active' : ''}`}
                    onClick={() => {
                      setCursor(new Date(Date.UTC(year, m, 1)));
                      setView('months');
                    }}
                  >
                    {year}
                  </span>
                ))}
              </td>
            </tr>
          </tbody>
          <Foot />
        </table>
      </div>
    );
  } else if (view === 'months') {
    body = (
      <div className="datepicker-months" style={{ display: 'block' }}>
        <table className="table-condensed">
          <Head label={String(y)} onPrev={() => move(-1)} onNext={() => move(1)} onSwitch={() => setView('years')} />
          <tbody>
            <tr>
              <td colSpan="7">
                {MONTHS_SHORT.map((label, i) => (
                  <span
                    key={label}
                    className={`month${sel && sel.getUTCFullYear() === y && sel.getUTCMonth() === i ? ' active' : ''}`}
                    onClick={() => {
                      setCursor(new Date(Date.UTC(y, i, 1)));
                      setView('days');
                    }}
                  >
                    {label}
                  </span>
                ))}
              </td>
            </tr>
          </tbody>
          <Foot />
        </table>
      </div>
    );
  } else {
    const first = new Date(Date.UTC(y, m, 1));
    const start = new Date(Date.UTC(y, m, 1 - first.getUTCDay()));
    const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => new Date(start.getTime() + (w * 7 + d) * 86_400_000)));
    body = (
      <div className="datepicker-days" style={{ display: 'block' }}>
        <table className="table-condensed">
          <Head label={`${MONTHS[m]} ${y}`} onPrev={() => move(0, -1)} onNext={() => move(0, 1)} onSwitch={() => setView('months')} />
          <thead>
            <tr>
              {DAYS_MIN.map((d) => (
                <th key={d} className="dow">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                {week.map((day) => {
                  const other = day.getUTCMonth() !== m;
                  const cls = `day${other ? (day < first ? ' old' : ' new') : ''}${day.getUTCDay() === 0 || day.getUTCDay() === 6 ? ' weekend' : ''}${sel && sel.getTime() === day.getTime() ? ' active' : ''}`;
                  return (
                    <td
                      key={day.getTime()}
                      className={cls}
                      onClick={() => {
                        if (other) {
                          setCursor(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1)));
                          setInput(`${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`);
                        } else pick(day.getUTCDate());
                      }}
                    >
                      {day.getUTCDate()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <Foot />
        </table>
      </div>
    );
  }

  return (
    <>
      <input
        ref={input}
        type="text"
        name={name}
        id={id}
        defaultValue={defaultValue}
        className={className}
        onFocus={(e) => {
          setValue(e.currentTarget.value);
          setCursor(parse(e.currentTarget.value) ?? new Date());
          setView('years');
          setOpen(true);
        }}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      />
      {open &&
        pos &&
        createPortal(
          <div className="datepicker datepicker-dropdown dropdown-menu datepicker-orient-left datepicker-orient-bottom" style={{ top: `${pos.top}px`, left: `${pos.left}px`, zIndex: 10, display: 'block' }}>
            {body}
          </div>,
          document.body,
        )}
    </>
  );
}
