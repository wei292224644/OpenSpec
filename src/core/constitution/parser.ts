export interface ConstitutionCriterion {
  type: 'structure' | 'judgment';
  text: string;
  positive?: string;
  negative?: string;
}

export interface ConstitutionClause {
  id: string;
  title: string;
  level: 'MUST' | 'SHOULD';
  body: string;
  criteria: ConstitutionCriterion[];
}

const HEADING = /^##\s+([IVX]+)\.\s+(.+?)\s+\((MUST|SHOULD)\)\s*$/u;
const CRITERION = /^-\s*判据\[(structure|judgment)\]:\s*(.+)$/u;
const POSITIVE = /^正例[:：]\s*(.+)$/u;
const NEGATIVE = /^反例[:：]\s*(.+)$/u;

export function parseConstitution(content: string): ConstitutionClause[] {
  const lines = content.split('\n');
  const clauses: ConstitutionClause[] = [];
  let current: ConstitutionClause | null = null;
  let currentCriterion: ConstitutionCriterion | null = null;
  const bodyLines: string[] = [];

  const flushBody = () => {
    if (current) current.body = bodyLines.join('\n').trim();
    bodyLines.length = 0;
  };

  for (const line of lines) {
    const h = HEADING.exec(line);
    if (h) {
      flushBody();
      current = { id: h[1], title: h[2], level: h[3] as 'MUST' | 'SHOULD', body: '', criteria: [] };
      currentCriterion = null;
      clauses.push(current);
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    const c = CRITERION.exec(trimmed);
    if (c) {
      currentCriterion = { type: c[1] as 'structure' | 'judgment', text: c[2].trim() };
      current.criteria.push(currentCriterion);
      continue;
    }
    if (currentCriterion) {
      const p = POSITIVE.exec(trimmed);
      if (p) {
        currentCriterion.positive = p[1].trim();
        continue;
      }
      const n = NEGATIVE.exec(trimmed);
      if (n) {
        currentCriterion.negative = n[1].trim();
        continue;
      }
    }
    if (current.criteria.length === 0) bodyLines.push(line);
  }
  flushBody();
  return clauses;
}
