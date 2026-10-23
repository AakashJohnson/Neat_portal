'use client';
// Angular reactive-forms semantics (@angular/forms 8.2) for the ported forms:
// controls start at their initial value (usually null, as in fb.group({x: [null, …]})),
// typing yields strings ('' once cleared), validity is computed by the same
// validator rules, and touched (blur) / dirty (user change) are tracked per
// control because templates show errors on `ctrl.touched && ctrl.errors?.x`.
import { useCallback, useMemo, useState } from 'react';

const isEmptyInputValue = (value) => value == null || value.length === 0;

// Copied from @angular/forms 8.2.14 (Validators.email).
const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Validators: each returns null (valid) or an errors object, like Angular's. */
export const Validators = {
  required: (v) => (isEmptyInputValue(v) ? { required: true } : null),
  requiredTrue: (v) => (v === true ? null : { required: true }),
  email: (v) => (isEmptyInputValue(v) || EMAIL_REGEXP.test(v) ? null : { email: true }),
  minLength: (n) => (v) => {
    if (isEmptyInputValue(v)) return null;
    const length = v ? v.length : 0;
    return length < n ? { minlength: { requiredLength: n, actualLength: length } } : null;
  },
  maxLength: (n) => (v) => {
    const length = v ? v.length : 0;
    return length > n ? { maxlength: { requiredLength: n, actualLength: length } } : null;
  },
  min: (min) => (v) => {
    if (isEmptyInputValue(v) || isEmptyInputValue(min)) return null;
    const value = parseFloat(v);
    return !isNaN(value) && value < min ? { min: { min, actual: v } } : null;
  },
  max: (max) => (v) => {
    if (isEmptyInputValue(v) || isEmptyInputValue(max)) return null;
    const value = parseFloat(v);
    return !isNaN(value) && value > max ? { max: { max, actual: v } } : null;
  },
  pattern: (pattern) => {
    if (!pattern) return () => null;
    let regex = pattern;
    let requiredPattern = String(pattern);
    if (typeof pattern === 'string') {
      requiredPattern = `${pattern.charAt(0) !== '^' ? '^' : ''}${pattern}${pattern.charAt(pattern.length - 1) !== '$' ? '$' : ''}`;
      regex = new RegExp(requiredPattern);
    }
    return (v) => {
      if (isEmptyInputValue(v)) return null;
      return regex.test(v) ? null : { pattern: { requiredPattern, actualValue: v } };
    };
  },
  /** Validators.compose([...]) — merged errors or null. */
  compose: (list) => (v) => {
    const errors = Object.assign({}, ...list.filter(Boolean).map((fn) => fn(v) ?? {}));
    return Object.keys(errors).length ? errors : null;
  },
};

/**
 * @param {Record<string, [any, (((v:any)=>object|null)|((v:any)=>object|null)[])?]>} spec
 *   same shape as fb.group({...}): name → [initialValue, validator(s)]
 * @param {(values: object) => object|null} [groupValidator]  form-level validator
 */
export function useFormGroup(spec, groupValidator) {
  const [initial] = useState(() => Object.fromEntries(Object.entries(spec).map(([k, [v]]) => [k, v ?? null])));
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState({});
  const [dirty, setDirty] = useState({});

  const errors = useMemo(() => {
    const out = {};
    for (const [k, [, validators]] of Object.entries(spec)) {
      const list = Array.isArray(validators) ? validators : validators ? [validators] : [];
      out[k] = Validators.compose(list)(value[k]);
    }
    return out;
    // spec is a literal recreated each render; validators are static per form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const groupErrors = groupValidator ? groupValidator(value) : null;
  const valid = !groupErrors && Object.values(errors).every((e) => e === null);

  const setControl = useCallback((name, v, { markDirty = true } = {}) => {
    setValue((prev) => ({ ...prev, [name]: v }));
    if (markDirty) setDirty((d) => ({ ...d, [name]: true }));
  }, []);

  /** Props for <input>/<textarea>/<select> bound with formControlName. */
  const bind = (name, { type } = {}) => ({
    name,
    value: value[name] ?? '',
    onChange: (e) => {
      const raw = e.target.value;
      // NumberValueAccessor: '' → null, otherwise parseFloat.
      setControl(name, type === 'number' ? (raw === '' ? null : parseFloat(raw)) : raw);
    },
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
  });

  /** Props for value-based controls (MatRadioGroup, MatSelect, …): value + onChange(value). */
  const bindValue = (name) => ({
    value: value[name],
    onChange: (v) => setControl(name, v),
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
  });

  /** Mirrors form.controls[name]: value, errors, valid, invalid, touched, dirty. */
  const control = (name) => ({
    value: value[name],
    errors: errors[name],
    valid: errors[name] === null,
    invalid: errors[name] !== null,
    touched: !!touched[name],
    untouched: !touched[name],
    dirty: !!dirty[name],
    pristine: !dirty[name],
  });

  return {
    value,
    valid,
    invalid: !valid,
    errors: groupErrors,
    bind,
    bindValue,
    control,
    setValue: setControl,
    patchValue: (patch) => setValue((prev) => ({ ...prev, ...patch })),
    markAllAsTouched: () => setTouched(Object.fromEntries(Object.keys(spec).map((k) => [k, true]))),
    // FormGroup.reset(value?): controls not given in `value` become null.
    reset: (to = {}) => {
      setValue(Object.fromEntries(Object.keys(initial).map((k) => [k, to[k] ?? null])));
      setTouched({});
      setDirty({});
    },
  };
}
