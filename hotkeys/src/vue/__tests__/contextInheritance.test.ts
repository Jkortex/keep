import { describe, expect, it } from 'vitest';
import { resolveProvidedContextId } from '../contextInheritance';

describe('resolveProvidedContextId', () => {
  it('provides the current context id when the node is active', () => {
    expect(resolveProvidedContextId(true, 'ctx_1', 'ctx_parent')).toBe('ctx_1');
  });

  it('falls back to the inherited parent id when the node is inactive', () => {
    expect(resolveProvidedContextId(false, 'ctx_1', 'ctx_parent')).toBe(
      'ctx_parent',
    );
  });

  it('keeps descendants unparented when both ids are absent', () => {
    expect(resolveProvidedContextId(false, null, null)).toBeNull();
  });
});
