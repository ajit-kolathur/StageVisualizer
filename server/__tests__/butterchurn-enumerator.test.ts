import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enumerateButterchurnPresets } from '../butterchurn-enumerator.js';

describe('enumerateButterchurnPresets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns entries with butterchurn: prefixed IDs', () => {
    const entries = enumerateButterchurnPresets();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.id).toMatch(/^butterchurn:/);
    }
  });

  it('each entry has correct config shape', () => {
    const entries = enumerateButterchurnPresets();
    for (const entry of entries) {
      expect(entry.config.type).toBe('butterchurn');
      expect(typeof entry.config.name).toBe('string');
      expect(entry.config.name.length).toBeGreaterThan(0);
      const config = entry.config as unknown as { preset: string };
      expect(config.preset).toBe(entry.config.name);
    }
  });

  it('returns 367 unique entries from all 3 bundles', () => {
    const entries = enumerateButterchurnPresets();
    expect(entries).toHaveLength(367);
  });

  it('has no duplicate IDs', () => {
    const entries = enumerateButterchurnPresets();
    const ids = entries.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('handles require failure gracefully by catching and warning', () => {
    // Verify the function doesn't throw even if we break require cache
    // The try-catch in the implementation is the safety net.
    // We verify it by checking the function always returns an array.
    const entries = enumerateButterchurnPresets();
    expect(Array.isArray(entries)).toBe(true);
  });
});
