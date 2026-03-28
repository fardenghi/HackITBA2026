import { describe, expect, it } from 'vitest';

describe('Phase 1 auth harness', () => {
  it('exposes desktop and mobile projects in Playwright config', async () => {
    const { default: config } = await import('../../playwright.config');
    const projectNames = (config.projects ?? []).map((project) => project.name);

    expect(projectNames).toContain('chromium');
    expect(projectNames).toContain('Mobile Chrome');
  });
});
