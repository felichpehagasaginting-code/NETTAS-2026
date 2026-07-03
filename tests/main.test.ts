import { describe, it, expect } from 'vitest';

describe('Config', () => {
  it('should export valid firebase config', async () => {
    const { firebaseConfig } = await import('../src/config');
    expect(firebaseConfig).toBeDefined();
    expect(firebaseConfig.projectId).toBe('nettas-2026');
    expect(firebaseConfig.databaseURL).toContain('firebaseio.com');
  });

  it('should have a valid admin hash', async () => {
    const { ADMIN_HASH } = await import('../src/config');
    expect(ADMIN_HASH).toBeDefined();
    expect(ADMIN_HASH.length).toBe(64);
  });

  it('should export pentatonic scale', async () => {
    const { PENTATONIC_SCALE } = await import('../src/config');
    expect(PENTATONIC_SCALE.length).toBe(11);
    expect(PENTATONIC_SCALE[0]).toBe(220.0);
  });
});

describe('Types', () => {
  it('should have correct structure', () => {
    const user: import('../src/types').UserData = { name: 'Test', clicks: 10 };
    expect(user.name).toBe('Test');
    expect(user.clicks).toBe(10);
  });
});
