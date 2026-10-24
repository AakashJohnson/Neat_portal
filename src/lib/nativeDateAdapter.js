// Angular Material 7.3.7 NativeDateAdapter (locale en-US, the app's LOCALE_ID)
// and MAT_NATIVE_DATE_FORMATS, ported from @angular/material/esm2015/core.js.
// Dates are JS Date objects in local time; display formatting goes through
// Intl with the local date parts re-created in UTC (as _format() does).

const LOCALE = 'en-US';
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|(?:(?:\+|-)\d{2}:\d{2}))?)?$/;

export const DATE_FORMATS = {
  parse: { dateInput: null },
  display: {
    dateInput: { year: 'numeric', month: 'numeric', day: 'numeric' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const strip = (s) => s.replace(/[‎‏]/g, '');
const fmt = (dtf, date) => dtf.format(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds())));

function createDateWithOverflow(year, month, date) {
  const result = new Date(year, month, date);
  if (year >= 0 && year < 100) result.setFullYear(result.getFullYear() - 1900);
  return result;
}

export const dateAdapter = {
  getYear: (d) => d.getFullYear(),
  getMonth: (d) => d.getMonth(),
  getDate: (d) => d.getDate(),
  getDayOfWeek: (d) => d.getDay(),
  getFirstDayOfWeek: () => 0,
  getMonthNames(style) {
    const dtf = new Intl.DateTimeFormat(LOCALE, { month: style, timeZone: 'utc' });
    return range(12, (i) => strip(fmt(dtf, new Date(2017, i, 1))));
  },
  getDateNames() {
    const dtf = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', timeZone: 'utc' });
    return range(31, (i) => strip(fmt(dtf, new Date(2017, 0, i + 1))));
  },
  getDayOfWeekNames(style) {
    const dtf = new Intl.DateTimeFormat(LOCALE, { weekday: style, timeZone: 'utc' });
    return range(7, (i) => strip(fmt(dtf, new Date(2017, 0, i + 1))));
  },
  getYearName(date) {
    return strip(fmt(new Intl.DateTimeFormat(LOCALE, { year: 'numeric', timeZone: 'utc' }), date));
  },
  getNumDaysInMonth(date) {
    return createDateWithOverflow(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  },
  clone: (d) => new Date(d.getTime()),
  createDate(year, month, date) {
    if (month < 0 || month > 11) throw Error(`Invalid month index "${month}". Month index has to be between 0 and 11.`);
    if (date < 1) throw Error(`Invalid date "${date}". Date has to be greater than 0.`);
    const result = createDateWithOverflow(year, month, date);
    if (result.getMonth() != month) throw Error(`Invalid date "${date}" for month with index "${month}".`);
    return result;
  },
  today: () => new Date(),
  parse(value) {
    if (typeof value == 'number') return new Date(value);
    return value ? new Date(Date.parse(value)) : null;
  },
  format(date, displayFormat) {
    if (!dateAdapter.isValid(date)) throw Error('NativeDateAdapter: Cannot format invalid date.');
    return strip(fmt(new Intl.DateTimeFormat(LOCALE, { ...displayFormat, timeZone: 'utc' }), date));
  },
  addCalendarYears: (date, years) => dateAdapter.addCalendarMonths(date, years * 12),
  addCalendarMonths(date, months) {
    let newDate = createDateWithOverflow(date.getFullYear(), date.getMonth() + months, date.getDate());
    if (newDate.getMonth() != (((date.getMonth() + months) % 12) + 12) % 12) {
      newDate = createDateWithOverflow(newDate.getFullYear(), newDate.getMonth(), 0);
    }
    return newDate;
  },
  addCalendarDays: (date, days) => createDateWithOverflow(date.getFullYear(), date.getMonth(), date.getDate() + days),
  toIso8601: (date) => [date.getUTCFullYear(), `0${date.getUTCMonth() + 1}`.slice(-2), `0${date.getUTCDate()}`.slice(-2)].join('-'),
  isDateInstance: (obj) => obj instanceof Date,
  isValid: (date) => !isNaN(date.getTime()),
  invalid: () => new Date(NaN),
  // DateAdapter base class
  deserialize(value) {
    if (typeof value === 'string') {
      if (!value) return null;
      if (ISO_8601_REGEX.test(value)) {
        const date = new Date(value);
        if (dateAdapter.isValid(date)) return date;
      }
    }
    if (value == null || (dateAdapter.isDateInstance(value) && dateAdapter.isValid(value))) return value;
    return dateAdapter.invalid();
  },
  compareDate(first, second) {
    return first.getFullYear() - second.getFullYear() || first.getMonth() - second.getMonth() || first.getDate() - second.getDate();
  },
  sameDate(first, second) {
    if (first && second) {
      const firstValid = dateAdapter.isValid(first);
      const secondValid = dateAdapter.isValid(second);
      if (firstValid && secondValid) return !dateAdapter.compareDate(first, second);
      return firstValid == secondValid;
    }
    return first == second;
  },
  clampDate(date, min, max) {
    if (min && dateAdapter.compareDate(date, min) < 0) return min;
    if (max && dateAdapter.compareDate(date, max) > 0) return max;
    return date;
  },
  getValidDateOrNull: (obj) => (dateAdapter.isDateInstance(obj) && dateAdapter.isValid(obj) ? obj : null),
};
