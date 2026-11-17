import { describe, it, expect } from 'vitest';
import { timeAgo, isAuthoredByUser, getInitials } from './utils.js';

describe('Frontend Utils', () => {
  it('getInitials extracts two letters uppercase', () => {
    expect(getInitials('Abebe', 'Kebede')).toBe('AK');
    expect(getInitials('John', '')).toBe('J');
    expect(getInitials('', '')).toBe('U');
  });

  it('isAuthoredByUser matches numeric and string IDs correctly', () => {
    expect(isAuthoredByUser({ author: { id: 1 } }, { id: 1 })).toBe(true);
    expect(isAuthoredByUser({ author: { id: '1' } }, { id: 1 })).toBe(true);
    expect(isAuthoredByUser({ author: { id: 2 } }, { id: 1 })).toBe(false);
    expect(isAuthoredByUser(null, { id: 1 })).toBe(false);
  });

  it('timeAgo formats dates gracefully', () => {
    const now = new Date();
    expect(timeAgo(now.toISOString())).toContain('ago');
    expect(timeAgo(null)).toBe('');
  });
});
