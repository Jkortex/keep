import * as theme from '../lib/theme';

export function setupLayout() {
  // ── Theme toggle ──
  const toggle = document.getElementById('theme-toggle');
  const sun = document.getElementById('sun-icon');
  const moon = document.getElementById('moon-icon');

  if (toggle && sun && moon) {
    theme.subscribe((currentTheme: 'light' | 'dark') => {
      const isDark = currentTheme === 'dark';
      sun.classList.toggle('hidden', !isDark);
      moon.classList.toggle('hidden', isDark);
    });

    toggle.addEventListener('click', () => theme.toggleTheme());
  }

  // ── Palette toggle button ──
  document.getElementById('palette-toggle')?.addEventListener('click', () => {
    (window as any).__openPalette?.('');
  });

  // ── Back to top ──
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          backToTop.style.display = window.scrollY > 400 ? 'flex' : 'none';
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

  // ── Global Tag Click Handler ──
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
