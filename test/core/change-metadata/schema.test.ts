import { describe, it, expect } from 'vitest';
import { ChangeMetadataSchema } from '../../../src/core/change-metadata/schema.js';

describe('ChangeMetadataSchema waivers', () => {
  it('accepts optional waivers with principle and reason', () => {
    const result = ChangeMetadataSchema.safeParse({
      schema: 'spec-driven',
      waivers: [
        { principle: 'I', reason: 'Internal scaffolding with no user-visible behavior' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects waiver without reason', () => {
    const result = ChangeMetadataSchema.safeParse({
      schema: 'spec-driven',
      waivers: [{ principle: 'I' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-roman principle format', () => {
    const result = ChangeMetadataSchema.safeParse({
      schema: 'spec-driven',
      waivers: [{ principle: '1', reason: 'test' }],
    });
    expect(result.success).toBe(false);
  });
});
