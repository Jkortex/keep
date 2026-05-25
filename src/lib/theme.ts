export type Theme = 'light' | 'dark';

type ThemeListener = (theme: Theme) => void;

const listeners = new Set<ThemeListener>();

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function isDark(): boolean {
  return getTheme() === 'dark';
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
  listeners.forEach((listener) => listener(theme));
}

export function toggleTheme(): Theme {
  const nextTheme: Theme = isDark() ? 'light' : 'dark';
  setTheme(nextTheme);
  return nextTheme;
}

export function subscribe(listener: ThemeListener): () => void {
  listeners.add(listener);
  // Emit immediately on subscription for UI synchronization
  if (typeof window !== 'undefined') {
    listener(getTheme());
  }
  return () => {
    listeners.delete(listener);
  };
}
