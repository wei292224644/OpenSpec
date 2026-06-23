import { describe, it, expect } from 'vitest';
import { parseConstitution } from '../../../src/core/constitution/parser.js';

const SAMPLE = `
## I. 产品行为语言 (MUST)
spec MUST use product behavior language.
- 判据[judgment]: 每条 requirement 是可观察结果而非实现
  正例: "用户提交后看到确认"
  反例: "调用 saveToDb()"

## II. 简单优先 (SHOULD)
design SHOULD stay minimal.
- 判据[structure]: design 含 Decisions 章节
- 判据[judgment]: 每处抽象能指向当前 change 的具体需求
`;

describe('parseConstitution', () => {
  it('parses numbered clauses with level and criteria', () => {
    const clauses = parseConstitution(SAMPLE);
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toMatchObject({ id: 'I', level: 'MUST', title: '产品行为语言' });
    expect(clauses[0].criteria[0].type).toBe('judgment');
    expect(clauses[1].level).toBe('SHOULD');
    expect(clauses[1].criteria).toHaveLength(2);
    expect(clauses[1].criteria.map((c) => c.type)).toEqual(['structure', 'judgment']);
  });

  it('returns empty array for content with no clauses', () => {
    expect(parseConstitution('# Project Constitution\n\nno clauses here')).toEqual([]);
  });
});
