export interface ConstitutionCriterion {
  type: 'structure' | 'judgment';
  text: string;
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

export function parseConstitution(content: string): ConstitutionClause[] {
  const lines = content.split('\n');
  const clauses: ConstitutionClause[] = [];
  let current: ConstitutionClause | null = null;
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
      clauses.push(current);
      continue;
    }
    if (!current) continue;
    const c = CRITERION.exec(line.trim());
    if (c) {
      current.criteria.push({ type: c[1] as 'structure' | 'judgment', text: c[2].trim() });
    } else if (current.criteria.length === 0) {
      bodyLines.push(line);
    }
  }
  flushBody();
  return clauses;
}
