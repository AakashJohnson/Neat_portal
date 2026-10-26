import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { carbonParse, carbonAge } from '../../src/utils/phpDate.js';

const ORACLE_NOW = new Date('2026-10-23T19:05:40Z');
const oracle = readFileSync(new URL('../fixtures/php-carbon-parse-oracle.jsonl', import.meta.url), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l));

// PHP warning texts for the rejected inputs (stderr of the oracle run).
const WARNINGS = {
  '15/01/2000': 'at position 0 (1): Unexpected character',
  '2000-13-01': 'at position 6 (3): Unexpected character',
  '2000-01-32': 'at position 9 (2): Unexpected character',
  36526: 'at position 4 (6): Unexpected character',
  abc: 'at position 0 (a): The timezone could not be found in the database',
  '15/1/2000': 'at position 0 (1): Unexpected character',
};

const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

describe('carbonParse / carbonAge vs PHP oracle', () => {
  for (const [input, parsed, age] of oracle) {
    it(JSON.stringify(input), () => {
      if (parsed === 'ERROR') {


        expect(() => carbonParse(input, ORACLE_NOW)).toThrow(`DateTime::__construct(): Failed to parse time string (${input}) ${WARNINGS[input]}`);
        return;
      }
      const d = carbonParse(input, ORACLE_NOW);
      expect(fmt(d)).toBe(parsed);
      expect(carbonAge(d, ORACLE_NOW)).toBe(age);
    });
  }
});
