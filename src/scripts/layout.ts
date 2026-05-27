import * as theme from '../lib/theme';

export function setupLayout() {
  const toggle = document.getElementById('theme-toggle');
  const sun = document.getElementById('sun-icon');
  const moon = document.getElementById('moon-icon');

  if (toggle && sun && moon) {
    const unsub = theme.subscribe((currentTheme: 'light' | 'dark') => {
      const isDark = currentTheme === 'dark';
      sun.classList.toggle('hidden', !isDark);
      moon.classList.toggle('hidden', isDark);
    });
    toggle.addEventListener('click', () => theme.toggleTheme());
    window.addEventListener('beforeunload', unsub);
  }

  document.getElementById('palette-toggle')?.addEventListener('click', () => {
    (window as any).togglePalette?.('');
  });

  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          backToTop.classList.toggle('hidden', window.scrollY <= 400);
          ticking = false;
        });
        ticking = true;
      }
    });
    backToTop.addEventListener('click', () => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  }

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const tagClickAttr = target.closest('[data-tag-click]') as HTMLElement | null;
    if (tagClickAttr) {
      e.preventDefault();
      e.stopPropagation();
      const tag = tagClickAttr.dataset.tagClick;
      if (!tag) return;

      if (window.location.pathname === '/') {
        (window as any).__filterByTag?.(tag);
      } else {
        window.location.href = '/?tag=' + encodeURIComponent(tag);
      }
    }
  });
}
