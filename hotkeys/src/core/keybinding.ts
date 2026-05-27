import {
  HOTKEY_MODES,
  type HotkeyBindingDefinition,
  type HotkeyMode,
} from './types';

export const SEQUENCE_TIMEOUT_MS = 1000;

export interface RegisteredHotkeyBinding extends HotkeyBindingDefinition {
  readonly normalizedKeys: string;
  readonly mode: HotkeyMode | readonly HotkeyMode[];
  readonly order: number;
  readonly preventDefault: boolean;
  readonly priority: number;
}

export const buildCandidateSequence = (
  stroke: string,
  pendingSequence: string | null,
  pendingExpiresAt: number,
): string => {
  if (!pendingSequence) return stroke;
  if (Date.now() > pendingExpiresAt) return stroke;
  return `${pendingSequence} ${stroke}`;
};

export const matchesBindingSequence = (
  candidate: string,
  normalizedKeys: string,
): boolean => {
  return (
    normalizedKeys === candidate || normalizedKeys.startsWith(`${candidate} `)
  );
};

export const normalizeBinding = (
  binding: HotkeyBindingDefinition,
  order: number,
): RegisteredHotkeyBinding => {
  return {
    ...binding,
    mode: binding.mode ?? HOTKEY_MODES.NORMAL,
    normalizedKeys: normalizeSequence(binding.keys),
    order,
    preventDefault: binding.preventDefault ?? true,
    priority: binding.priority ?? 0,
  };
};

export const normalizeSequence = (sequence: string): string => {
  return sequence
    .trim()
    .split(/\s+/)
    .map((stroke) => normalizeStroke(stroke))
    .join(' ');
};

export const toKeyboardStroke = (event: KeyboardEvent): string | null => {
  const key = normalizeKey(event.key);
  if (!key || isModifierOnly(key)) return null;

  const modifiers: string[] = [];
  // 常量替换meta，ctrl等硬编码
  if (event.metaKey) modifiers.push('meta');
  if (event.ctrlKey) modifiers.push('ctrl');
  if (event.altKey) modifiers.push('alt');

  const shouldTrackShift =
    event.shiftKey &&
    (key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey);
  if (shouldTrackShift) modifiers.push('shift');

  return [...modifiers, key].join('+');
};

const isModifierOnly = (key: string): boolean => {
  return ['meta', 'control', 'shift', 'alt'].includes(key);
};

const normalizeKey = (rawKey: string): string => {
  if (!rawKey) return '';
  if (rawKey === ' ') return 'space';
  if (rawKey === 'Esc') return 'escape';
  return rawKey.toLowerCase();
};

const normalizeStroke = (stroke: string): string => {
  const parts = stroke
    .toLowerCase()
    .split('+')
    .map((item) => item.trim())
    .filter(Boolean);
  const key = parts.pop();
  if (!key) return '';

  const modifiers: string[] = [];
  if (parts.includes('meta') || parts.includes('cmd')) modifiers.push('meta');
  if (parts.includes('ctrl') || parts.includes('control'))
    modifiers.push('ctrl');
  if (parts.includes('alt') || parts.includes('option')) modifiers.push('alt');
  if (parts.includes('shift')) modifiers.push('shift');

  return [...modifiers, key].join('+');
};
