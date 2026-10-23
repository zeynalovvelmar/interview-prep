export type ThemeMode = 'system' | 'light' | 'dark';

export class ThemeManager {
  private static STORAGE_KEY = 'color-scheme';

  public static getTheme(): ThemeMode {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // Storage might be restricted
    }
    return 'system';
  }

  public static getResolvedTheme(): 'light' | 'dark' {
    const theme = this.getTheme();
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  public static setTheme(mode: ThemeMode): void {
    const meta = document.querySelector('meta[name="color-scheme"]');
    try {
      if (mode === 'system') {
        localStorage.removeItem(this.STORAGE_KEY);
        if (meta) meta.setAttribute('content', 'light dark');
      } else {
        localStorage.setItem(this.STORAGE_KEY, mode);
        if (meta) meta.setAttribute('content', mode);
      }
    } catch (e) {
      console.warn('Could not persist theme preference', e);
      if (meta) meta.setAttribute('content', mode === 'system' ? 'light dark' : mode);
    }

    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { mode } }));
  }

  public static toggle(): ThemeMode {
    const currentResolved = this.getResolvedTheme();
    const nextTheme: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
    return nextTheme;
  }

  public static init(): void {
    const current = this.getTheme();
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute('content', current === 'system' ? 'light dark' : current);
    }

    // Listen to OS preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.getTheme() === 'system') {
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { mode: 'system' } }));
      }
    });

    // Listen to storage changes across tabs
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY) {
        const newTheme = this.getTheme();
        const m = document.querySelector('meta[name="color-scheme"]');
        if (m) m.setAttribute('content', newTheme === 'system' ? 'light dark' : newTheme);
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { mode: newTheme } }));
      }
    });
  }
}
