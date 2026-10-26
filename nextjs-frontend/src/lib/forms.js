'use client';
// Reactive-form behavior based on @angular/forms 8.2:
// controls start at their initial value (usually null, as in fb.group({x: [null, …]})),
// typing yields strings ('' once cleared), validity is computed by the same
// validator rules, and touched (blur) / dirty (user change) are tracked per
// control because templates show errors on `ctrl.touched && ctrl.errors?.x`.
import { useCallback, useMemo, useState } from 'react';

const isEmptyInputValue = (value) => value == null || value.length === 0;

// Copied from @angular/forms 8.2.14 (Validators.email).
const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;


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
 *   same shape as fb.group({...}): name → [initialValue, validator(s)];
 *   initialValue may be a boxed state { value, disabled } as in Angular.
 * @param {(values: object) => object|null} [groupValidator]  form-level validator
 */
export function useFormGroup(spec, groupValidator) {
  const isBoxed = (v) => v !== null && typeof v === 'object' && Object.keys(v).length === 2 && 'value' in v && 'disabled' in v;
  const [initial] = useState(() => Object.fromEntries(Object.entries(spec).map(([k, [v]]) => [k, isBoxed(v) ? (v.value ?? null) : (v ?? null)])));
  const [value, setValue] = useState(initial);
  // Disabled controls: no errors, ignored by validity, left out of `value`.
  const [disabled, setDisabled] = useState(() => Object.fromEntries(Object.entries(spec).map(([k, [v]]) => [k, isBoxed(v) && !!v.disabled])));
  const [touched, setTouched] = useState({});
  const [dirty, setDirty] = useState({});
  // FormGroupDirective.submitted: set by the form's submit event.
  const [submitted, setSubmitted] = useState(false);
  // Validators replaced at runtime (setValidators/clearValidators).
  const [overrides, setOverrides] = useState({});
  // Validators contributed by control directives (e.g. matDatepicker's parse/min/max).
  const [directiveErrors, setDirectiveErrorsState] = useState({});

  const controlErrors = useMemo(() => {
    const out = {};
    for (const [k, [, specValidators]] of Object.entries(spec)) {
      const validators = k in overrides ? overrides[k] : specValidators;
      const list = Array.isArray(validators) ? validators : validators ? [validators] : [];
      if (disabled[k]) {
        out[k] = null;
        continue;
      }
      const own = Validators.compose(list)(value[k]);
      const extra = directiveErrors[k] ?? null;
      out[k] = own || extra ? { ...(own ?? {}), ...(extra ?? {}) } : null;
    }
    return out;
    // spec is a literal recreated each render; validators are static per form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, overrides, directiveErrors, disabled]);
  // A group validator may return { controlErrors: { name: {...} } } to emulate
  // control.setErrors() from inside it (it replaces that control's errors);
  // any other non-null result is a group-level error.
  const groupResult = groupValidator ? groupValidator(value) : null;
  const errors = groupResult?.controlErrors ? { ...controlErrors, ...groupResult.controlErrors } : controlErrors;
  const groupErrors = groupResult && !groupResult.controlErrors ? groupResult : null;
  const valid = !groupErrors && Object.values(errors).every((e) => e === null);

  const setControl = useCallback((name, v, { markDirty = true } = {}) => {
    setValue((prev) => ({ ...prev, [name]: v }));
    if (markDirty) setDirty((d) => ({ ...d, [name]: true }));
  }, []);

  /** Props for <input>/<textarea>/<select> bound with formControlName. */
  const bind = (name, { type } = {}) => ({
    name,
    value: value[name] ?? '',
    disabled: !!disabled[name],
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
    disabled: !!disabled[name],
    onChange: (v) => setControl(name, v),
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
  });

  /** Default ErrorStateMatcher: control.invalid && (control.touched || form submitted). */
  const errorState = (name) => errors[name] !== null && (!!touched[name] || submitted);

  /** Mirrors form.controls[name]: value, errors, valid, invalid, touched, dirty. */
  const control = (name) => ({
    value: value[name],
    errors: errors[name],
    valid: errors[name] === null,
    invalid: errors[name] !== null,
    disabled: !!disabled[name],
    touched: !!touched[name],
    untouched: !touched[name],
    dirty: !!dirty[name],
    pristine: !dirty[name],
  });

  return {
    // FormGroup.value excludes disabled controls; getRawValue() includes them.
    value: Object.fromEntries(Object.entries(value).filter(([k]) => !disabled[k])),
    getRawValue: () => ({ ...value }),
    valid,
    invalid: !valid,
    errors: groupErrors,
    submitted,
    bind,
    bindValue,
    control,
    errorState,
    /** Call from the form's onSubmit: marks the FormGroupDirective submitted. */
    markSubmitted: () => setSubmitted(true),
    /** control.setValidators(list) / clearValidators() (pass null to clear). */
    setValidators: (name, validators) => setOverrides((o) => ({ ...o, [name]: validators ?? [] })),
    hasError: (name, code) => !!errors[name]?.[code],
    /** A control directive's validator result for `name` (null = valid). */
    setDirectiveErrors: (name, errs) =>
      setDirectiveErrorsState((d) => (JSON.stringify(d[name] ?? null) === JSON.stringify(errs ?? null) ? d : { ...d, [name]: errs ?? null })),
    setValue: setControl,
    // patchValue ignores names that are not controls of the group.
    patchValue: (patch) => setValue((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(patch).filter(([k]) => k in prev)) })),
    markAllAsTouched: () => setTouched(Object.fromEntries(Object.keys(spec).map((k) => [k, true]))),
    markAsTouched: (name) => setTouched((t) => ({ ...t, [name]: true })),
    isDisabled: (name) => !!disabled[name],
    disable: (name) => setDisabled((d) => ({ ...d, [name]: true })),
    enable: (name) => setDisabled((d) => ({ ...d, [name]: false })),
    /** FormGroup.enable(): every control. */
    enableAll: () => setDisabled((d) => Object.fromEntries(Object.keys(d).map((k) => [k, false]))),
    // FormGroup.reset(value?): controls not given in `value` become null.
    reset: (to = {}) => {
      setValue(Object.fromEntries(Object.keys(initial).map((k) => [k, to[k] ?? null])));
      setTouched({});
      setDirty({});
      setSubmitted(false);
    },
  };
}
