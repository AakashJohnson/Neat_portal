


import { db, table } from '../database/knex.js';
import { HttpError } from '../http/respond.js';
import { isEmail } from '../utils/str.js';

const MESSAGES = {
  accepted: 'The :attribute must be accepted.',
  alpha: 'The :attribute may only contain letters.',
  alpha_dash: 'The :attribute may only contain letters, numbers, and dashes.',
  alpha_num: 'The :attribute may only contain letters and numbers.',
  array: 'The :attribute must be an array.',
  boolean: 'The :attribute field must be true or false.',
  confirmed: 'The :attribute confirmation does not match.',
  date: 'The :attribute is not a valid date.',
  digits: 'The :attribute must be :digits digits.',
  digits_between: 'The :attribute must be between :min and :max digits.',
  email: 'The :attribute must be a valid email address.',
  exists: 'The selected :attribute is invalid.',
  in: 'The selected :attribute is invalid.',
  integer: 'The :attribute must be an integer.',
  numeric: 'The :attribute must be a number.',
  regex: 'The :attribute format is invalid.',
  required: 'The :attribute field is required.',
  required_if: 'The :attribute field is required when :other is :value.',
  same: 'The :attribute and :other must match.',
  string: 'The :attribute must be a string.',
  unique: 'The :attribute has already been taken.',
  min: {
    numeric: 'The :attribute must be at least :min.',
    file: 'The :attribute must be at least :min kilobytes.',
    string: 'The :attribute must be at least :min characters.',
    array: 'The :attribute must have at least :min items.',
  },
  max: {
    numeric: 'The :attribute may not be greater than :max.',
    file: 'The :attribute may not be greater than :max kilobytes.',
    string: 'The :attribute may not be greater than :max characters.',
    array: 'The :attribute may not have more than :max items.',
  },
  between: {
    numeric: 'The :attribute must be between :min and :max.',
    file: 'The :attribute must be between :min and :max kilobytes.',
    string: 'The :attribute must be between :min and :max characters.',
    array: 'The :attribute must have between :min and :max items.',
  },
};


const attributeName = (field) => field.replace(/_/g, ' ');

const isEmptyValue = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

const isNumeric = (v) => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)));

function sizeOf(value, rules) {
  if (rules.has('numeric') || rules.has('integer')) return { kind: 'numeric', size: Number(value) };
  if (Array.isArray(value)) return { kind: 'array', size: value.length };
  if (value && typeof value === 'object' && 'size' in value && 'originalname' in value) {
    return { kind: 'file', size: value.size / 1024 };
  }
  return { kind: 'string', size: [...String(value)].length };
}

function parse(ruleString) {
  return ruleString
    .split('|')
    .filter(Boolean)
    .map((r) => {
      const [name, params = ''] = r.split(/:(.*)/s);
      return { name, params: params === '' ? [] : name === 'regex' ? [params] : params.split(',') };
    });
}

function format(template, field, replacements = {}) {
  let msg = template.replace(':attribute', attributeName(field));
  for (const [k, v] of Object.entries(replacements)) msg = msg.replace(`:${k}`, v);
  return msg;
}

/**
 * Validate data against pipe-separated rules for each field.
 * @returns {Promise<Record<string,string[]>>} errors keyed by field (empty when valid)
 */
export async function validate(data, rules) {
  const errors = {};
  const add = (field, msg) => (errors[field] ??= []).push(msg);

  for (const [field, ruleString] of Object.entries(rules)) {
    const parsed = parse(ruleString);
    const names = new Set(parsed.map((r) => r.name));
    const value = data?.[field];
    const empty = isEmptyValue(value);

    for (const { name, params } of parsed) {
      if (name === 'nullable' || name === 'sometimes' || name === 'bail') continue;

      if (name === 'required') {
        if (empty) {
          add(field, format(MESSAGES.required, field));
          break;
        }
        continue;
      }
      if (name === 'required_if') {
        const [other, ...vals] = params;
        if (vals.map(String).includes(String(data?.[other])) && empty) {
          add(field, format(MESSAGES.required_if, field, { other: attributeName(other), value: vals[0] }));
          break;
        }
        continue;
      }
      if (empty) continue; // non-implicit rules are skipped for empty values

      let ok = true;
      let replacements = {};
      let template = MESSAGES[name];

      switch (name) {
        case 'string': ok = typeof value === 'string'; break;
        case 'email': ok = isEmail(value); break;
        case 'numeric': ok = isNumeric(value); break;
        case 'integer': ok = /^-?\d+$/.test(String(value)); break;
        case 'boolean': ok = [true, false, 0, 1, '0', '1'].includes(value); break;
        case 'array': ok = Array.isArray(value); break;
        case 'accepted': ok = ['yes', 'on', '1', 1, true, 'true'].includes(value); break;
        case 'alpha': ok = /^[\p{L}\p{M}]+$/u.test(String(value)); break;
        case 'alpha_num': ok = /^[\p{L}\p{M}\p{N}]+$/u.test(String(value)); break;
        case 'alpha_dash': ok = /^[\p{L}\p{M}\p{N}_-]+$/u.test(String(value)); break;
        case 'date': ok = !Number.isNaN(Date.parse(String(value))); break;
        case 'regex': {
          const m = params[0].match(/^\/(.*)\/([a-z]*)$/s);
          ok = m ? new RegExp(m[1], m[2].replace('u', '') + 'u').test(String(value)) : true;
          break;
        }
        case 'in': ok = params.includes(String(value)); break;
        case 'confirmed': ok = data?.[`${field}_confirmation`] === value; break;
        case 'same': ok = data?.[params[0]] === value; replacements = { other: attributeName(params[0]) }; break;
        case 'digits': ok = /^\d+$/.test(String(value)) && String(value).length === Number(params[0]); replacements = { digits: params[0] }; break;
        case 'digits_between': {
          const len = String(value).length;
          ok = /^\d+$/.test(String(value)) && len >= Number(params[0]) && len <= Number(params[1]);
          replacements = { min: params[0], max: params[1] };
          break;
        }
        case 'min':
        case 'max':
        case 'between': {
          const { kind, size } = sizeOf(value, names);
          template = MESSAGES[name][kind];
          if (name === 'min') { ok = size >= Number(params[0]); replacements = { min: params[0] }; }
          if (name === 'max') { ok = size <= Number(params[0]); replacements = { max: params[0] }; }
          if (name === 'between') { ok = size >= Number(params[0]) && size <= Number(params[1]); replacements = { min: params[0], max: params[1] }; }
          break;
        }
        case 'unique': {
          // unique:table,column,exceptId,idColumn
          const [tbl, column = field, except, idColumn = 'id'] = params;
          const q = db(table(tbl)).where(column, value);
          if (except && except !== 'NULL') q.whereNot(idColumn, except);
          const row = await q.first(db.raw('1 as found'));
          ok = !row;
          break;
        }
        case 'exists': {
          const [tbl, column = field] = params;
          const row = await db(table(tbl)).where(column, value).first(db.raw('1 as found'));
          ok = !!row;
          break;
        }
        default:
          throw new Error(`Unsupported validation rule "${name}" on field "${field}"`);
      }

      if (!ok) add(field, format(template, field, replacements));
    }
  }
  return errors;
}


export async function validateOrFail(data, rules) {
  const errors = await validate(data, rules);
  if (Object.keys(errors).length) {
    throw new HttpError(422, { message: 'The given data was invalid.', errors });
  }
}


export const validateRequest = (rules) => async (req, _res, next) => {
  try {
    await validateOrFail({ ...req.query, ...req.body }, rules);
    next();
  } catch (err) {
    next(err);
  }
};
