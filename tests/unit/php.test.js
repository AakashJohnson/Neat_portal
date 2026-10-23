import { describe, it, expect } from 'vitest';
import { looseEq, phpMultiply, phpNumberToString, phpConcat, prop, PhpError } from '../../src/utils/php.js';

describe('PHP 7.4 semantics', () => {
  it('loose equality (==)', () => {
    expect(looseEq(null, '')).toBe(true);
    expect(looseEq(null, '0')).toBe(false);
    expect(looseEq(null, 0)).toBe(true);
    expect(looseEq('3', 3)).toBe(true);
    expect(looseEq('3.0', '3')).toBe(true);
    expect(looseEq(0, 'abc')).toBe(true); // PHP 7 behaviour
    expect(looseEq(12, '12abc')).toBe(true);
    expect(looseEq('abc', 'ABC')).toBe(false);
    expect(looseEq(null, 'All')).toBe(false);
    expect(looseEq(true, 'x')).toBe(true);
    expect(looseEq(false, '0')).toBe(true);
  });

  it('multiplication with coercion and warnings', () => {
    expect(phpMultiply('500', '2')).toBe(1000);
    expect(phpMultiply('499.5', 2)).toBe(999);
    expect(phpMultiply('500', null)).toBe(0);
    expect(() => phpMultiply('Free', 2)).toThrow('A non-numeric value encountered');
    expect(() => phpMultiply('12abc', 2)).toThrow('A non well formed numeric value encountered');
  });

  it('number to string (precision 14)', () => {
    expect(phpNumberToString(1000)).toBe('1000');
    expect(phpNumberToString(999.0)).toBe('999');
    expect(phpNumberToString(1.1 * 3)).toBe('3.3');
    expect(phpNumberToString(0.1 + 0.2)).toBe('0.3');
    expect(phpNumberToString(1e25)).toBe('1.0E+25');
    expect(phpConcat('fee=', 1.1 * 3, null, true)).toBe('fee=3.31');
  });

  it('property access on null', () => {
    expect(() => prop(null, 'course_name')).toThrow(PhpError);
    expect(() => prop(null, 'course_name')).toThrow("Trying to get property 'course_name' of non-object");
    expect(prop({ a: 1 }, 'a')).toBe(1);
  });
});
