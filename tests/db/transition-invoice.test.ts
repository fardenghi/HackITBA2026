import { describe, expect, it } from 'vitest';
import { access } from 'node:fs/promises';

describe('Phase 1 transition test harness', () => {
  it('has a migration file ready to validate lifecycle invariants', async () => {
    await expect(access('supabase/migrations/0001_foundation_schema.sql')).resolves.toBeUndefined();
  });
});
