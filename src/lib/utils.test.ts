/**
 * Utility Tests
 *
 * Tests the cn() class merging function.
 */

import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (class name utility)', () => {
  it('merges multiple class strings', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toContain('base');
    expect(result).toContain('active');
  });

  it('filters out falsy values', () => {
    const result = cn('base', false, null, undefined, '', 'visible');
    expect(result).toBe('base visible');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    const result = cn('px-4', 'px-8');
    // tailwind-merge should resolve to px-8 (last wins)
    expect(result).toBe('px-8');
  });

  it('resolves complex Tailwind conflicts', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles array input', () => {
    const result = cn(['px-4', 'py-2']);
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
  });

  it('handles object input', () => {
    const result = cn({ 'px-4': true, 'py-2': false, 'mx-auto': true });
    expect(result).toContain('px-4');
    expect(result).not.toContain('py-2');
    expect(result).toContain('mx-auto');
  });
});
