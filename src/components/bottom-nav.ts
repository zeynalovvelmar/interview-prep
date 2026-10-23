import { SearchModal } from './search-modal';
import { Sidebar } from './sidebar';

export function createBottomNav(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav-bar';
  nav.setAttribute('aria-label', 'Mobil Naviqasiya');

  nav.innerHTML = `
    <a href="#/" class="bottom-nav-item" data-route="#/">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      <span>Əsas</span>
    </a>

    <a href="#/topics" class="bottom-nav-item" data-route="#/topics">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      </svg>
      <span>Mövzular</span>
    </a>

    <button type="button" class="bottom-nav-item search-bottom-btn" id="bottom-search-btn" aria-label="Axtar">
      <div class="bottom-search-circle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      <span>Axtar</span>
    </button>

    <a href="#/qa" class="bottom-nav-item" data-route="#/qa">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span>Suallar</span>
    </a>

    <button type="button" class="bottom-nav-item menu-bottom-btn" id="bottom-menu-btn" aria-label="Menyu">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
      <span>Menyu</span>
    </button>
  `;

  nav.querySelector('#bottom-search-btn')?.addEventListener('click', () => {
    SearchModal.open();
  });

  nav.querySelector('#bottom-menu-btn')?.addEventListener('click', () => {
    Sidebar.openDrawer();
  });

  return nav;
}

export function updateBottomNavActive(currentHash: string): void {
  const items = document.querySelectorAll('.bottom-nav-item[data-route]');
  items.forEach((item) => {
    const route = item.getAttribute('data-route') || '';
    if (route === '#/' && (currentHash === '#/' || currentHash === '')) {
      item.classList.add('active');
    } else if (route !== '#/' && currentHash.startsWith(route)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}
