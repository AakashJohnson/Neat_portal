'use client';
// mat-datepicker (Angular Material 7.3.7, popup mode, NativeDateAdapter en-US)
// ported from @angular/material/esm2015/datepicker.js: the input directive
// (parse on input, format on blur/write, parse/min/max validators, Alt+Down),
// the toggle button, the popup (CDK connected overlay with four positions,
// transparent backdrop, Esc / Alt+Up to close) and mat-calendar with its
// month / year / multi-year views, header and keyboard navigation.
// Usage:
//   const picker = useDatepicker();
//   <MatDatepickerInput picker={picker} form={form} name="date_of_birth" min={…} max={…} className="form-control" placeholder="…" />
//   <MatDatepickerToggle picker={picker} matsuffix="" />
//   <MatDatepicker picker={picker} />
import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { getOverlayContainer, nextOverlayId } from '@/components/cdk/overlay';
import { dateAdapter as A, DATE_FORMATS } from '@/lib/nativeDateAdapter';

const KEY = { ENTER: 13, SPACE: 32, PAGE_UP: 33, PAGE_DOWN: 34, END: 35, HOME: 36, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ESC: 27 };
const YEARS_PER_PAGE = 24;
const YEARS_PER_ROW = 4;
const INTL = {
  openCalendarLabel: 'Open calendar',
  prev: { month: 'Previous month', year: 'Previous year', 'multi-year': 'Previous 20 years' },
  next: { month: 'Next month', year: 'Next year', 'multi-year': 'Next 20 years' },
  switchToMonthViewLabel: 'Choose date',
  switchToMultiYearViewLabel: 'Choose month and year',
};
let datepickerUid = 0;

// ---------------------------------------------------------------- controller
/** The <mat-datepicker #picker> instance shared by its input and toggle. */
export function useDatepicker() {
  const [picker] = useState(() => {
    const listeners = new Set();
    const p = {
      id: `mat-datepicker-${datepickerUid++}`,
      opened: false,
      input: null, // { el, getValue, min, max, select(date) }
      focusedBeforeOpen: null,
      subscribe: (l) => (listeners.add(l), () => listeners.delete(l)),
      emit: () => listeners.forEach((l) => l()),
      setInput: (input) => {
        p.input = input;
      },
      open() {
        if (p.opened || !p.input) return;
        p.focusedBeforeOpen = document.activeElement;
        p.opened = true;
        p.emit();
      },
      close() {
        if (!p.opened) return;
        p.opened = false;
        p.emit();
        if (p.focusedBeforeOpen && typeof p.focusedBeforeOpen.focus === 'function') p.focusedBeforeOpen.focus();
        p.focusedBeforeOpen = null;
      },
    };
    return p;
  });
  return picker;
}

const useOpened = (picker) => useSyncExternalStore(picker.subscribe, () => picker.opened, () => false);

// --------------------------------------------------------------------- input
/**
 * <input matInput [matDatepicker]> bound to a reactive-form control: the
 * control value is a Date (or null); the text is formatted by the adapter.
 */
export const MatDatepickerInput = forwardRef(function MatDatepickerInput({ picker, form, name, min, max, className = '', onKeyPress, invalid, required = false, ...rest }, ref) {
  const elRef = useRef(null);
  const uid = `mat-input-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const opened = useOpened(picker);
  const control = form.control(name);
  const value = A.getValidDateOrNull(A.deserialize(control.value ?? null));
  // _lastValueValid: null when the text parses (or is empty), else the text.
  const [parseError, setParseError] = useState(null);
  const shown = useRef(undefined);
  const minDate = A.getValidDateOrNull(A.deserialize(min ?? null));
  const maxDate = A.getValidDateOrNull(A.deserialize(max ?? null));

  // writeValue → _formatValue
  const valueKey = value ? value.getTime() : null;
  useLayoutEffect(() => {
    if (!elRef.current) return;
    if (shown.current === undefined || !A.sameDate(shown.current, value)) {
      elRef.current.value = value ? A.format(value, DATE_FORMATS.display.dateInput) : '';
      shown.current = value;
      setParseError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the date value
  }, [valueKey]);

  // matDatepickerParse / matDatepickerMin / matDatepickerMax
  const errs = {};
  if (parseError !== null) errs.matDatepickerParse = { text: parseError };
  if (minDate && value && A.compareDate(minDate, value) > 0) errs.matDatepickerMin = { min: minDate, actual: value };
  if (maxDate && value && A.compareDate(maxDate, value) < 0) errs.matDatepickerMax = { max: maxDate, actual: value };
  const errKey = JSON.stringify(Object.keys(errs));
  useEffect(() => {
    form.setDirectiveErrors(name, Object.keys(errs).length ? errs : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by error names
  }, [errKey, name]);

  // matDatepicker input registration (current value, bounds, select callback).
  useLayoutEffect(() => {
    picker.setInput({
      el: elRef,
      getValue: () => value,
      min: minDate,
      max: maxDate,
      select: (date) => {
        // datepicker._selectedChanged → value, cvaOnChange, onTouched
        shown.current = undefined;
        form.setValue(name, date);
        form.markAsTouched(name);
      },
    });
  });

  return (
    <input
      ref={(el) => {
        elRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      className={`${className} mat-input-element mat-form-field-autofill-control cdk-text-field-autofill-monitored`.trim()}
      matinput=""
      id={rest.id ?? uid}
      aria-invalid={String(!!invalid)}
      aria-required={String(!!required)}
      aria-haspopup="true"
      aria-owns={opened ? picker.id : undefined}
      min={minDate ? A.toIso8601(minDate) : undefined}
      max={maxDate ? A.toIso8601(maxDate) : undefined}
      disabled={control.disabled}
      {...rest}
      onInput={(e) => {
        let date = A.parse(e.target.value);
        setParseError(!date || A.isValid(date) ? null : e.target.value);
        date = A.getValidDateOrNull(date);
        if (!A.sameDate(date, value)) {
          shown.current = date;
          form.setValue(name, date);
        }
      }}
      onBlur={() => {
        if (value && elRef.current) elRef.current.value = A.format(value, DATE_FORMATS.display.dateInput);
        form.markAsTouched(name);
      }}
      onKeyDown={(e) => {
        if (e.altKey && e.keyCode === KEY.DOWN && !elRef.current.readOnly) {
          picker.open();
          e.preventDefault();
        }
      }}
      onKeyPress={onKeyPress}
    />
  );
});

// -------------------------------------------------------------------- toggle
export function MatDatepickerToggle({ picker, ...rest }) {
  const opened = useOpened(picker);
  return (
    <mat-datepicker-toggle class={`mat-datepicker-toggle${opened ? ' mat-datepicker-toggle-active' : ''}`} tabindex="-1" {...rest}>
      <button aria-haspopup="true" mat-icon-button="" type="button" className="mat-icon-button" aria-label={INTL.openCalendarLabel} tabIndex={0} onClick={(e) => (e.stopPropagation(), picker.open())}>
        <span className="mat-button-wrapper">
          <svg className="mat-datepicker-toggle-default-icon" fill="currentColor" focusable="false" height="24px" viewBox="0 0 24 24" width="24px">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"></path>
          </svg>
        </span>
        <div className="mat-button-ripple mat-ripple mat-button-ripple-round"></div>
        <div className="mat-button-focus-overlay"></div>
      </button>
    </mat-datepicker-toggle>
  );
}

// ------------------------------------------------------------- calendar body
function CalendarBody({ label, rows, todayValue, selectedValue, labelMinRequiredCells, numCols = 7, activeCell, cellAspectRatio = 1, onSelect, onKeyDown, bodyRef }) {
  const firstRowOffset = rows && rows.length && rows[0].length ? numCols - rows[0].length : 0;
  const cellPadding = `${(50 * cellAspectRatio) / numCols}%`;
  const cellWidth = `${100 / numCols}%`;
  const isActive = (r, c) => {
    let n = r * numCols + c;
    if (r) n -= firstRowOffset;
    return n == activeCell;
  };
  return (
    <tbody ref={bodyRef} mat-calendar-body="" role="grid" aria-readonly="true" className="mat-calendar-body" onKeyDown={onKeyDown}>
      {firstRowOffset < labelMinRequiredCells && (
        <tr aria-hidden="true">
          <td className="mat-calendar-body-label" colSpan={numCols} style={{ paddingTop: cellPadding, paddingBottom: cellPadding }}>
            {label}
          </td>
        </tr>
      )}
      {rows.map((row, r) => (
        <tr key={r} role="row">
          {r === 0 && firstRowOffset > 0 && (
            <td aria-hidden="true" className="mat-calendar-body-label" colSpan={firstRowOffset} style={{ paddingTop: cellPadding, paddingBottom: cellPadding }}>
              {firstRowOffset >= labelMinRequiredCells ? label : ''}
            </td>
          )}
          {row.map((item, c) => (
            <td
              key={c}
              role="gridcell"
              className={['mat-calendar-body-cell', !item.enabled && 'mat-calendar-body-disabled', isActive(r, c) && 'mat-calendar-body-active'].filter(Boolean).join(' ')}
              tabIndex={isActive(r, c) ? 0 : -1}
              aria-label={item.ariaLabel}
              aria-disabled={!item.enabled ? 'true' : undefined}
              aria-selected={String(selectedValue === item.value)}
              onClick={() => item.enabled && onSelect(item.value)}
              style={{ width: cellWidth, paddingTop: cellPadding, paddingBottom: cellPadding }}
            >
              <div className={['mat-calendar-body-cell-content', selectedValue === item.value && 'mat-calendar-body-selected', todayValue === item.value && 'mat-calendar-body-today'].filter(Boolean).join(' ')}>
                {item.displayValue}
              </div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

const cell = (value, displayValue, ariaLabel, enabled) => ({ value, displayValue, ariaLabel, enabled });

// ------------------------------------------------------------------ calendar
function Calendar({ id, startAt, selected, minDate, maxDate, onSelected, onUserSelection, visible }) {
  const clamp = (d) => A.clampDate(A.getValidDateOrNull(d) || A.today(), minDate, maxDate);
  const [activeDate, setActiveDateState] = useState(() => clamp(startAt || A.today()));
  const [view, setView] = useState('month');
  const [focusTick, setFocusTick] = useState(0);
  const bodyRef = useRef(null);
  const setActive = (d) => setActiveDateState(clamp(d));

  // _focusActiveCell after opening (MatDatepickerContent.ngAfterViewInit, once the
  // pane is placed and focusable), view changes and keyboard moves.
  useEffect(() => {
    if (visible) bodyRef.current?.querySelector('.mat-calendar-body-active')?.focus();
  }, [focusTick, view, visible]);

  const year = A.getYear(activeDate);
  const month = A.getMonth(activeDate);
  const today = A.today();
  const moveAndFocus = (d) => {
    setActive(d);
    setFocusTick((t) => t + 1);
  };

  // ---- header
  let periodButtonText;
  if (view == 'month') periodButtonText = A.format(activeDate, DATE_FORMATS.display.monthYearLabel).toLocaleUpperCase();
  else if (view == 'year') periodButtonText = A.getYearName(activeDate);
  else {
    const first = A.getYearName(A.createDate(year - (year % 24), 0, 1));
    const last = A.getYearName(A.createDate(year + YEARS_PER_PAGE - 1 - (year % 24), 0, 1));
    periodButtonText = `${first} – ${last}`;
  }
  const isSameView = (d1, d2) => {
    if (view == 'month') return A.getYear(d1) == A.getYear(d2) && A.getMonth(d1) == A.getMonth(d2);
    if (view == 'year') return A.getYear(d1) == A.getYear(d2);
    return Math.floor(A.getYear(d1) / YEARS_PER_PAGE) == Math.floor(A.getYear(d2) / YEARS_PER_PAGE);
  };
  const previousEnabled = !minDate || !isSameView(activeDate, minDate);
  const nextEnabled = !maxDate || !isSameView(activeDate, maxDate);
  const step = (dir) =>
    setActive(view == 'month' ? A.addCalendarMonths(activeDate, dir) : A.addCalendarYears(activeDate, view == 'year' ? dir : dir * YEARS_PER_PAGE));

  // ---- views
  let table;
  if (view == 'month') {
    const weekdaysNarrow = A.getDayOfWeekNames('narrow');
    const weekdaysLong = A.getDayOfWeekNames('long');
    const firstOfMonth = A.createDate(year, month, 1);
    const firstWeekOffset = (7 + A.getDayOfWeek(firstOfMonth) - A.getFirstDayOfWeek()) % 7;
    const dateNames = A.getDateNames();
    const weeks = [[]];
    for (let i = 0, c = firstWeekOffset; i < A.getNumDaysInMonth(activeDate); i++, c++) {
      if (c == 7) {
        weeks.push([]);
        c = 0;
      }
      const date = A.createDate(year, month, i + 1);
      const enabled = (!minDate || A.compareDate(date, minDate) >= 0) && (!maxDate || A.compareDate(date, maxDate) <= 0);
      weeks[weeks.length - 1].push(cell(i + 1, dateNames[i], A.format(date, DATE_FORMATS.display.dateA11yLabel), enabled));
    }
    const inMonth = (d) => (d && A.getYear(d) == year && A.getMonth(d) == month ? A.getDate(d) : null);
    const selectDay = (day) => {
      if (inMonth(selected) != day) {
        const date = A.createDate(year, month, day);
        if (!A.sameDate(date, selected)) onSelected(date);
      }
      onUserSelection();
    };
    const keydown = (e) => {
      const map = {
        [KEY.LEFT]: () => A.addCalendarDays(activeDate, -1),
        [KEY.RIGHT]: () => A.addCalendarDays(activeDate, 1),
        [KEY.UP]: () => A.addCalendarDays(activeDate, -7),
        [KEY.DOWN]: () => A.addCalendarDays(activeDate, 7),
        [KEY.HOME]: () => A.addCalendarDays(activeDate, 1 - A.getDate(activeDate)),
        [KEY.END]: () => A.addCalendarDays(activeDate, A.getNumDaysInMonth(activeDate) - A.getDate(activeDate)),
        [KEY.PAGE_UP]: () => (e.altKey ? A.addCalendarYears(activeDate, -1) : A.addCalendarMonths(activeDate, -1)),
        [KEY.PAGE_DOWN]: () => (e.altKey ? A.addCalendarYears(activeDate, 1) : A.addCalendarMonths(activeDate, 1)),
      };
      if (e.keyCode === KEY.ENTER || e.keyCode === KEY.SPACE) {
        selectDay(A.getDate(activeDate));
        onUserSelection();
        e.preventDefault();
        return;
      }
      if (!map[e.keyCode]) return;
      moveAndFocus(map[e.keyCode]());
      e.preventDefault();
    };
    table = (
      <mat-month-view>
        <table className="mat-calendar-table">
          <thead className="mat-calendar-table-header">
            <tr>
              {weekdaysNarrow.map((d, i) => (
                <th key={i} aria-label={weekdaysLong[i]}>
                  {d}
                </th>
              ))}
            </tr>
            <tr>
              <th aria-hidden="true" className="mat-calendar-table-header-divider" colSpan={7}></th>
            </tr>
          </thead>
          <CalendarBody
            bodyRef={bodyRef}
            label={A.getMonthNames('short')[month].toLocaleUpperCase()}
            rows={weeks}
            todayValue={inMonth(today)}
            selectedValue={inMonth(selected)}
            labelMinRequiredCells={3}
            activeCell={A.getDate(activeDate) - 1}
            onSelect={selectDay}
            onKeyDown={keydown}
          />
        </table>
      </mat-month-view>
    );
  } else if (view == 'year') {
    const monthNames = A.getMonthNames('short');
    const enabledMonth = (m) =>
      !(maxDate && (year > A.getYear(maxDate) || (year === A.getYear(maxDate) && m > A.getMonth(maxDate)))) &&
      !(minDate && (year < A.getYear(minDate) || (year === A.getYear(minDate) && m < A.getMonth(minDate))));
    const months = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11],
    ].map((row) => row.map((m) => cell(m, monthNames[m].toLocaleUpperCase(), A.format(A.createDate(year, m, 1), DATE_FORMATS.display.monthYearA11yLabel), enabledMonth(m))));
    const inYear = (d) => (d && A.getYear(d) == year ? A.getMonth(d) : null);
    const selectMonth = (m) => {
      const normalized = A.createDate(year, m, 1);
      const days = A.getNumDaysInMonth(normalized);
      // _goToDateInView(date, 'month')
      setActive(A.createDate(year, m, Math.min(A.getDate(activeDate), days)));
      setView('month');
    };
    const keydown = (e) => {
      const map = {
        [KEY.LEFT]: () => A.addCalendarMonths(activeDate, -1),
        [KEY.RIGHT]: () => A.addCalendarMonths(activeDate, 1),
        [KEY.UP]: () => A.addCalendarMonths(activeDate, -4),
        [KEY.DOWN]: () => A.addCalendarMonths(activeDate, 4),
        [KEY.HOME]: () => A.addCalendarMonths(activeDate, -A.getMonth(activeDate)),
        [KEY.END]: () => A.addCalendarMonths(activeDate, 11 - A.getMonth(activeDate)),
        [KEY.PAGE_UP]: () => A.addCalendarYears(activeDate, e.altKey ? -10 : -1),
        [KEY.PAGE_DOWN]: () => A.addCalendarYears(activeDate, e.altKey ? 10 : 1),
      };
      if (e.keyCode === KEY.ENTER || e.keyCode === KEY.SPACE) {
        selectMonth(A.getMonth(activeDate));
        e.preventDefault();
        return;
      }
      if (!map[e.keyCode]) return;
      moveAndFocus(map[e.keyCode]());
      e.preventDefault();
    };
    table = (
      <mat-year-view>
        <table className="mat-calendar-table">
          <thead className="mat-calendar-table-header">
            <tr>
              <th className="mat-calendar-table-header-divider" colSpan={4}></th>
            </tr>
          </thead>
          <CalendarBody
            bodyRef={bodyRef}
            label={A.getYearName(activeDate)}
            rows={months}
            todayValue={inYear(today)}
            selectedValue={inYear(selected)}
            labelMinRequiredCells={2}
            numCols={4}
            cellAspectRatio={4 / 7}
            activeCell={month}
            onSelect={selectMonth}
            onKeyDown={keydown}
          />
        </table>
      </mat-year-view>
    );
  } else {
    const activeOffset = year % YEARS_PER_PAGE;
    const years = [];
    for (let i = 0, row = []; i < YEARS_PER_PAGE; i++) {
      row.push(year - activeOffset + i);
      if (row.length == YEARS_PER_ROW) {
        years.push(
          row.map((y) => {
            const name = A.getYearName(A.createDate(y, 0, 1));
            return cell(y, name, name, !((maxDate && y > A.getYear(maxDate)) || (minDate && y < A.getYear(minDate))));
          }),
        );
        row = [];
      }
    }
    const selectYear = (y) => {
      const days = A.getNumDaysInMonth(A.createDate(y, month, 1));
      setActive(A.createDate(y, month, Math.min(A.getDate(activeDate), days)));
      setView('year');
    };
    const keydown = (e) => {
      const map = {
        [KEY.LEFT]: () => A.addCalendarYears(activeDate, -1),
        [KEY.RIGHT]: () => A.addCalendarYears(activeDate, 1),
        [KEY.UP]: () => A.addCalendarYears(activeDate, -YEARS_PER_ROW),
        [KEY.DOWN]: () => A.addCalendarYears(activeDate, YEARS_PER_ROW),
        [KEY.HOME]: () => A.addCalendarYears(activeDate, -year % YEARS_PER_PAGE),
        [KEY.END]: () => A.addCalendarYears(activeDate, YEARS_PER_PAGE - (year % YEARS_PER_PAGE) - 1),
        [KEY.PAGE_UP]: () => A.addCalendarYears(activeDate, e.altKey ? -YEARS_PER_PAGE * 10 : -YEARS_PER_PAGE),
        [KEY.PAGE_DOWN]: () => A.addCalendarYears(activeDate, e.altKey ? YEARS_PER_PAGE * 10 : YEARS_PER_PAGE),
      };
      if (e.keyCode === KEY.ENTER || e.keyCode === KEY.SPACE) {
        selectYear(year);
        e.preventDefault();
        return;
      }
      if (!map[e.keyCode]) return;
      moveAndFocus(map[e.keyCode]());
      e.preventDefault();
    };
    table = (
      <mat-multi-year-view>
        <table className="mat-calendar-table">
          <thead className="mat-calendar-table-header">
            <tr>
              <th className="mat-calendar-table-header-divider" colSpan={4}></th>
            </tr>
          </thead>
          <CalendarBody
            bodyRef={bodyRef}
            rows={years}
            todayValue={A.getYear(today)}
            selectedValue={selected ? A.getYear(selected) : null}
            numCols={4}
            cellAspectRatio={4 / 7}
            activeCell={year % YEARS_PER_PAGE}
            onSelect={selectYear}
            onKeyDown={keydown}
          />
        </table>
      </mat-multi-year-view>
    );
  }

  const button = (cls, props, children) => (
    <button type="button" {...props} className={cls}>
      <span className="mat-button-wrapper">{children}</span>
      <div className={`mat-button-ripple mat-ripple${cls.includes('mat-icon-button') ? ' mat-button-ripple-round' : ''}`}></div>
      <div className="mat-button-focus-overlay"></div>
    </button>
  );

  return (
    <mat-calendar class="mat-calendar" cdktrapfocus="" id={id}>
      <mat-calendar-header>
        <div className="mat-calendar-header">
          <div className="mat-calendar-controls">
            {button(
              'mat-calendar-period-button mat-button',
              { 'mat-button': '', cdkarialive: 'polite', 'aria-label': view == 'month' ? INTL.switchToMultiYearViewLabel : INTL.switchToMonthViewLabel, onClick: () => setView(view == 'month' ? 'multi-year' : 'month') },
              <>
                {periodButtonText}
                <div className={`mat-calendar-arrow${view != 'month' ? ' mat-calendar-invert' : ''}`}></div>
              </>,
            )}
            <div className="mat-calendar-spacer"></div>
            {button('mat-calendar-previous-button mat-icon-button', { 'mat-icon-button': '', disabled: !previousEnabled, 'aria-label': INTL.prev[view], onClick: () => step(-1) })}
            {button('mat-calendar-next-button mat-icon-button', { 'mat-icon-button': '', disabled: !nextEnabled, 'aria-label': INTL.next[view], onClick: () => step(1) })}
          </div>
        </div>
      </mat-calendar-header>
      <div cdkmonitorsubtreefocus="" className="mat-calendar-content" tabIndex={-1}>
        {table}
      </div>
    </mat-calendar>
  );
}

// ---------------------------------------------------------------- the popup
const POSITIONS = [
  { ox: 'start', oy: 'bottom', px: 'start', py: 'top' },
  { ox: 'start', oy: 'top', px: 'start', py: 'bottom' },
  { ox: 'end', oy: 'bottom', px: 'end', py: 'top' },
  { ox: 'end', oy: 'top', px: 'end', py: 'bottom' },
];
const VIEWPORT_MARGIN = 8;

/** One opening of the popup (mounted fresh each time the datepicker opens). */
function DatepickerPopup({ picker }) {
  const paneRef = useRef(null);
  const [placement, setPlacement] = useState(null);
  const [overlayId] = useState(() => nextOverlayId());
  const [anim, setAnim] = useState('void');

  useEffect(() => {
    const onKey = (e) => {
      if (e.keyCode === KEY.ESC || (e.altKey && e.keyCode === KEY.UP)) picker.close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [picker]);

  // FlexibleConnectedPositionStrategy (exact, viewport margin 8, push enabled).
  useLayoutEffect(() => {
    if (placement || !paneRef.current || !picker.input?.el.current) return;
    const origin = picker.input.el.current.getBoundingClientRect();
    const overlay = paneRef.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const vp = { top: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN, right: vw - VIEWPORT_MARGIN, bottom: vh - VIEWPORT_MARGIN };
    let fallback = null;
    let chosen = null;
    for (const pos of POSITIONS) {
      const ox = pos.ox === 'start' ? origin.left : origin.right;
      const oy = pos.oy === 'top' ? origin.top : origin.bottom;
      const x = ox + (pos.px === 'start' ? 0 : -overlay.width);
      const y = oy + (pos.py === 'top' ? 0 : -overlay.height);
      const visW = Math.max(0, overlay.width - Math.max(0, vp.left - x) - Math.max(0, x + overlay.width - vp.right));
      const visH = Math.max(0, overlay.height - Math.max(0, vp.top - y) - Math.max(0, y + overlay.height - vp.bottom));
      const area = visW * visH;
      if (area === overlay.width * overlay.height) {
        chosen = { pos, x, y };
        break;
      }
      if (!fallback || fallback.area < area) fallback = { pos, x, y, area };
    }
    if (!chosen) {
      // _pushOverlayOnScreen
      let { x, y } = fallback;
      if (overlay.width <= vp.right - vp.left) x += Math.max(0, vp.left - x) || -Math.max(0, x + overlay.width - vp.right);
      else x = vp.left;
      if (overlay.height <= vp.bottom - vp.top) y += Math.max(0, vp.top - y) || -Math.max(0, y + overlay.height - vp.bottom);
      else y = vp.top;
      chosen = { pos: fallback.pos, x, y };
    }
    const style = { pointerEvents: 'auto' };
    if (chosen.pos.py === 'bottom') style.bottom = `${vh - (chosen.y + overlay.height)}px`;
    else style.top = `${chosen.y}px`;
    if (chosen.pos.px === 'end') style.right = `${vw - (chosen.x + overlay.width)}px`;
    else style.left = `${chosen.x}px`;
    setPlacement({ style, origin: `${chosen.pos.px === 'start' ? 'left' : 'right'} ${chosen.pos.py === 'top' ? 'top' : 'bottom'}` });
  }, [placement, picker]);

  useEffect(() => {
    if (!placement) return;
    const raf = requestAnimationFrame(() => setAnim('enter'));
    return () => cancelAnimationFrame(raf);
  }, [placement]);

  const input = picker.input;
  return createPortal(
    <>
      <div className="cdk-overlay-backdrop mat-overlay-transparent-backdrop cdk-overlay-backdrop-showing" onClick={() => picker.close()}></div>
      <div className="cdk-overlay-connected-position-bounding-box" dir="ltr" style={{ top: 0, left: 0, height: '100%', width: '100%' }}>
        <div ref={paneRef} id={overlayId} className="cdk-overlay-pane mat-datepicker-popup" role="dialog" style={placement ? placement.style : { visibility: 'hidden', pointerEvents: 'auto' }}>
          <mat-datepicker-content
            class="mat-datepicker-content"
            style={{
              transformOrigin: placement?.origin,
              transition: 'opacity 120ms cubic-bezier(0, 0, 0.2, 1), transform 120ms cubic-bezier(0, 0, 0.2, 1)',
              ...(anim === 'enter' ? { opacity: 1, transform: 'scale(1, 1)' } : { opacity: 0, transform: 'scale(1, 0.8)' }),
            }}
          >
            <div tabIndex={0} className="cdk-visually-hidden cdk-focus-trap-anchor" aria-hidden="true"></div>
            <Calendar
              id={picker.id}
              startAt={input.getValue()}
              selected={input.getValue()}
              minDate={input.min}
              maxDate={input.max}
              onSelected={(date) => input.select(date)}
              onUserSelection={() => picker.close()}
              visible={!!placement}
            />
            <div tabIndex={0} className="cdk-visually-hidden cdk-focus-trap-anchor" aria-hidden="true"></div>
          </mat-datepicker-content>
        </div>
      </div>
    </>,
    getOverlayContainer(),
  );
}

export function MatDatepicker({ picker }) {
  const opened = useOpened(picker);
  return (
    <>
      <mat-datepicker></mat-datepicker>
      {opened && picker.input && <DatepickerPopup picker={picker} />}
    </>
  );
}
