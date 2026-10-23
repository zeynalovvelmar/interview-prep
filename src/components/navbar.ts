import { SearchModal } from './search-modal';
import { ThemeManager } from '../state/theme';

export function createNavbar(onToggleDrawer: () => void): HTMLElement {
  const nav = document.createElement('header');
  nav.className = 'site-header';
  nav.setAttribute('role', 'banner');

  nav.innerHTML = `
    <div class="header-inner">
      <div class="header-left">
        <button type="button" class="icon-btn mobile-menu-btn" id="mobile-menu-toggle" aria-label="Menyunu aç">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <a href="#/" class="brand-link" aria-label="Ana Səhifə">
          <span class="brand-logo">
            <svg width="26" height="26" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#2563eb" />
                  <stop offset="100%" stop-color="#0284c7" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="20" fill="url(#bgGrad)" />
              <ellipse cx="50" cy="28" rx="26" ry="9" fill="#ffffff" opacity="0.95"/>
              <path d="M24,28 v16 c0,5 11.5,9 26,9 s26,-4 26,-9 v-16" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
              <path d="M24,46 v16 c0,5 11.5,9 26,9 s26,-4 26,-9 v-16" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
              <path d="M24,64 v9 c0,5 11.5,9 26,9 s26,-4 26,-9 v-9" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
            </svg>
          </span>
          <div class="brand-text">
            <span class="brand-title">Data Mühəndisi</span>
            <span class="brand-sub">Atəşgah Sığorta Hazırlığı</span>
          </div>
        </a>
      </div>

      <div class="header-right">
        <button type="button" class="search-trigger-btn" id="nav-search-btn" aria-label="Axtarış pəncərəsini aç">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span class="search-label">Axtar...</span>
          <kbd class="search-kbd">/</kbd>
        </button>

        <button type="button" class="icon-btn theme-toggle-btn" id="theme-toggle-btn" aria-label="Gecə/Gündüz rejimini dəyiş">
          <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg class="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Drawer toggle
  nav.querySelector('#mobile-menu-toggle')?.addEventListener('click', onToggleDrawer);

  // Search trigger
  nav.querySelector('#nav-search-btn')?.addEventListener('click', () => {
    SearchModal.open();
  });

  // Theme toggle
  nav.querySelector('#theme-toggle-btn')?.addEventListener('click', () => {
    ThemeManager.toggle();
  });

  return nav;
}
