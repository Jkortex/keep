import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../../src/scripts/search';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b < c')).toBe('a &amp; b &lt; c');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('returns safe text unchanged', () => {
    expect(escapeHtml('safe text 123')).toBe('safe text 123');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});
