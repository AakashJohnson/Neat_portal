'use client';
// proengsoft/laravel-jsvalidation for the panel forms, with the app's override
// of the `bootstrap` view (resources/views/vendor/jsvalidation/bootstrap.php):
// span.invalid-feedback right after the field; .is-invalid on the <input>
// itself and never on a textarea/select (closest('.form-group input')); no
// .is-valid (its success() callback receives the label, not the input); no
// form-group classes. The FormRequest's local rules are checked with Laravel's
// English messages (resources/lang/en/validation.php); empty optional fields
// are skipped as jquery.validate does. Remote rules (unique / exists) are left
// to the server: its 422 errors show in the page's error alert (DEV-F09).
//   const v = useJsValidation({ email: 'required|email', password: 'required|min:8|confirmed' });
//   <input className="form-control" … {...v.field('email')} />{v.error('email')}
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
  const [inputs, setInputs] = useState({}); // field → highlightable (<input> inside .form-group)
  const [submitted, setSubmitted] = useState(false);

  const values = (form) => Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === 'string' ? v : v.name]));
  const highlightable = (el) => el?.tagName === 'INPUT' && !!el.closest('.form-group');

  const run = (name, form) => {
    const el = form.elements.namedItem(name);
    if (!(name in rules) || !el) return null;
    const msg = validateField(name, rules[name], values(form));
    setErrors((e) => ({ ...e, [name]: msg }));
    setInputs((s) => ({ ...s, [name]: highlightable(el) }));
    return msg;
  };

  return {
    errors,
    /** submit handler check: every rule whose element exists; focuses/scrolls to the first error (focus_on_error). */
    validateAll(form) {
      setSubmitted(true);
      const all = values(form);
      const next = {};
      const kinds = {};
      let first = null;
      for (const name of Object.keys(rules)) {
        const el = form.elements.namedItem(name);
        if (!el) continue; // jquery.validate ignores rules without an element
        const msg = validateField(name, rules[name], all);
        next[name] = msg;
        kinds[name] = highlightable(el);
        if (msg && !first) first = el;
      }
      setErrors(next);
      setInputs(kinds);
      if (first) {
        window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
        first.focus?.();
      }
      return !first;
    },
    /** props for an input: re-validates on keyup once invalid / submitted, and on focusout. */
    field(name) {
      const invalid = !!errors[name];
      return {
        onKeyUp: (e) => (submitted || errors[name]) && run(name, e.currentTarget.form),
        onBlur: (e) => (submitted || !isEmpty(e.currentTarget.value)) && run(name, e.currentTarget.form),
        // highlight/unhighlight add/remove .is-invalid on the input (the class
        // attribute is otherwise owned by React, which leaves it untouched);
        // jquery.validate also maintains aria-invalid / aria-describedby.
        ref: (el) => {
          if (!el || !(name in errors)) return;
          if (highlightable(el)) el.classList.toggle('is-invalid', invalid);
          el.setAttribute('aria-invalid', String(invalid));
          el.setAttribute('aria-describedby', `${name}-error`);
        },
      };
    },
    /**
     * <span class="invalid-feedback"> after the field. Next to an .is-invalid
     * input the stylesheet shows it as a block; for other fields jQuery's
     * show() made it display:inline; once valid it is hidden.
     */
    error(name) {
      if (!(name in errors)) return null;
      const style = !errors[name] ? { display: 'none' } : inputs[name] ? undefined : { display: 'inline' };
      return (
        <span id={`${name}-error`} className="invalid-feedback" style={style}>
          {errors[name] ?? ''}
        </span>
      );
    },
    /** The form group keeps its classes (the override sets none). */
    groupClass(name, base = 'form-group') {
      return base;
    },
  };
}
