import { describe, it, expect } from 'vitest';
import { parseConstitution } from '../../../src/core/constitution/parser.js';

const SAMPLE = `
## I. Product Behavior Language (MUST)
spec MUST use product behavior language.
- CRITERION[judgment]: each requirement is an observable outcome, not an implementation
  PASS: "user sees a confirmation after submitting"
  FAIL: "calls saveToDb()"

## II. Simplicity First (SHOULD)
design SHOULD stay minimal.
- criterion[structure]: design has a Decisions section
- CRITERION[judgment]: every abstraction maps to a concrete requirement of the current change
`;

describe('parseConstitution', () => {
  it('parses numbered clauses with level and criteria', () => {
    const clauses = parseConstitution(SAMPLE);
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toMatchObject({ id: 'I', level: 'MUST', title: 'Product Behavior Language' });
    expect(clauses[0].criteria[0].type).toBe('judgment');
    expect(clauses[1].level).toBe('SHOULD');
    expect(clauses[1].criteria).toHaveLength(2);
    expect(clauses[1].criteria.map((c) => c.type)).toEqual(['structure', 'judgment']);
  });

  it('captures pass/fail examples for a criterion', () => {
    const clauses = parseConstitution(SAMPLE);
    expect(clauses[0].criteria[0]).toMatchObject({
      positive: '"user sees a confirmation after submitting"',
      negative: '"calls saveToDb()"',
    });
    // criteria without examples leave the fields undefined
    expect(clauses[1].criteria[0].positive).toBeUndefined();
  });

  it('returns empty array for content with no clauses', () => {
    expect(parseConstitution('# Project Constitution\n\nno clauses here')).toEqual([]);
  });
});
