'use client';
// proengsoft/laravel-jsvalidation (bootstrap template) for the panel forms:
// the FormRequest's local rules checked in the browser with Laravel's English
// messages (resources/lang/en/validation.php); empty optional fields are
// skipped as jquery.validate does. Remote rules (unique / exists) are left to
// the server: its 422 errors show in the page's error alert (DEV-F09).
//   const v = useJsValidation({ email: 'required|email', password: 'required|min:8|confirmed' });
//   <input … {...v.field('email')} />{v.error('email')}
//   onSubmit: if (!v.validateAll(formElement)) return;
import { useState } from 'react';

const attribute = (name) => name.replace(/_/g, ' ');
const isEmpty = (v) => v === undefined || v === null || String(v) === '';

/** One rule → message or null. `values` gives access to other fields. */
function check(name, value, rule, values) {
  const [key, arg] = rule.split(/:(.*)/s);
  const attr = attribute(name);
  const len = String(value ?? '').length;
  switch (key) {
    case 'required':
      return isEmpty(value) ? `The ${attr} field is required.` : null;
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) ? null : `The ${attr} must be a valid email address.`;
    case 'min':
      return len < Number(arg) ? `The ${attr} must be at least ${arg} characters.` : null;
    case 'max':
      return len > Number(arg) ? `The ${attr} may not be greater than ${arg} characters.` : null;
    case 'confirmed':
      return String(value) !== String(values[`${name}_confirmation`] ?? '') ? `The ${attr} confirmation does not match.` : null;
    case 'same':
      return String(value) !== String(values[arg] ?? '') ? `The ${attr} and ${attribute(arg)} must match.` : null;
    case 'regex': {
      const m = arg.match(/^\/(.*)\/([a-z]*)$/s);
      return m && !new RegExp(m[1], m[2]).test(String(value)) ? `The ${attr} format is invalid.` : null;
    }
    case 'date':
      return Number.isNaN(Date.parse(String(value))) ? `The ${attr} is not a valid date.` : null;
    case 'numeric':
      return Number.isNaN(Number(value)) || String(value).trim() === '' ? `The ${attr} must be a number.` : null;
    case 'boolean':
      return ['0', '1', 'true', 'false', true, false, 0, 1].includes(value) ? null : `The ${attr} field must be true or false.`;
    default:
      return null; // nullable, unique, exists, … (server-side)
  }
}

/** First failing rule's message for `name`, or null. */
export function validateField(name, rules, values) {
  const list = String(rules).split('|');
  const value = values[name];
  if (isEmpty(value) && !list.includes('required')) return null;
  for (const rule of list) {
    const msg = check(name, value, rule, values);
    if (msg) return msg;
  }
  return null;
}

/** jquery.validate state for one form. */
export function useJsValidation(rules) {
  const [errors, setErrors] = useState({});
  const [validated, setValidated] = useState({}); // field → 'error' | 'success'
  const [submitted, setSubmitted] = useState(false);

  const values = (form) => Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === 'string' ? v : v.name]));

  const run = (name, form) => {
    if (!(name in rules) || !form.elements.namedItem(name)) return null;
    const msg = validateField(name, rules[name], values(form));
    setErrors((e) => ({ ...e, [name]: msg }));
    setValidated((s) => ({ ...s, [name]: msg ? 'error' : 'success' }));
    return msg;
  };

  return {
    errors,
    /** submit handler check: every rule whose element exists; focuses/scrolls to the first error (focus_on_error). */
    validateAll(form) {
      setSubmitted(true);
      const all = values(form);
      const next = {};
      const state = {};
      let first = null;
      for (const name of Object.keys(rules)) {
        const el = form.elements.namedItem(name);
        if (!el) continue; // jquery.validate ignores rules without an element
        const msg = validateField(name, rules[name], all);
        next[name] = msg;
        state[name] = msg ? 'error' : 'success';
        if (msg && !first) first = el;
      }
      setErrors(next);
      setValidated(state);
      if (first) {
        window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
        first.focus?.();
      }
      return !first;
    },
    /** props for an input: re-validates on keyup once invalid / submitted, and on focusout. */
    field(name) {
      return {
        onKeyUp: (e) => (submitted || errors[name]) && run(name, e.currentTarget.form),
        onBlur: (e) => (submitted || !isEmpty(e.currentTarget.value)) && run(name, e.currentTarget.form),
      };
    },
    /** <span class="help-block error-help-block"> after the input (hidden once valid). */
    error(name) {
      if (!(name in errors)) return null;
      return (
        <span id={`${name}-error`} className="help-block error-help-block" style={errors[name] ? undefined : { display: 'none' }}>
          {errors[name] ?? ''}
        </span>
      );
    },
    /** .form-group has-error / has-success */
    groupClass(name, base = 'form-group') {
      return `${base}${validated[name] === 'error' ? ' has-error' : validated[name] === 'success' ? ' has-success' : ''}`;
    },
  };
}
