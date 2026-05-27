import { describe, expect, it, vi } from 'vitest';
import {
  buildCandidateSequence,
  matchesBindingSequence,
  normalizeBinding,
  normalizeSequence,
  toKeyboardStroke,
} from '../keybinding';
import { HOTKEY_MODES } from '../types';

const createKeyboardEvent = (
  overrides: Partial<KeyboardEvent> & { key: string },
): KeyboardEvent => {
  const { key, ...rest } = overrides;

  return {
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: false,
    shiftKey: false,
    ...rest,
  } as unknown as KeyboardEvent;
};

describe('keybinding helpers', () => {
  it('normalizes bindings with runtime defaults', () => {
    const binding = normalizeBinding(
      {
        commandId: 'memo.next',
        keys: 'Cmd+K',
      },
      3,
    );

    expect(binding).toMatchObject({
      commandId: 'memo.next',
      mode: HOTKEY_MODES.NORMAL,
      normalizedKeys: 'meta+k',
      order: 3,
      preventDefault: true,
      priority: 0,
    });
  });

  it('normalizes multi-stroke sequences and modifier aliases', () => {
    expect(normalizeSequence('g  Shift+H')).toBe('g shift+h');
    expect(normalizeSequence('Cmd+K Control+P')).toBe('meta+k ctrl+p');
  });

  it('builds and matches candidate sequences until they expire', () => {
    const nowSpy = vi
      .spyOn(Date, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(1500);

    expect(buildCandidateSequence('h', 'g', 200)).toBe('g h');
    expect(buildCandidateSequence('h', 'g', 200)).toBe('h');
    expect(matchesBindingSequence('g', 'g h')).toBe(true);
    expect(matchesBindingSequence('g x', 'g h')).toBe(false);

    nowSpy.mockRestore();
  });

  it('serializes browser keyboard events into normalized strokes', () => {
    expect(
      toKeyboardStroke(
        createKeyboardEvent({
          key: 'K',
          metaKey: true,
        }),
      ),
    ).toBe('meta+k');

    expect(
      toKeyboardStroke(
        createKeyboardEvent({
          key: 'ArrowDown',
          shiftKey: true,
        }),
      ),
    ).toBe('shift+arrowdown');

    expect(
      toKeyboardStroke(
        createKeyboardEvent({
          key: ' ',
        }),
      ),
    ).toBe('space');

    expect(
      toKeyboardStroke(
        createKeyboardEvent({
          key: 'Shift',
        }),
      ),
    ).toBeNull();
  });
});
