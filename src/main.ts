import './style.css';
import { ThemeManager } from './state/theme';
import { SearchIndexManager } from './search/search-index';
import { SearchModal } from './components/search-modal';
import { createNavbar } from './components/navbar';
import { Sidebar } from './components/sidebar';
import { createBottomNav } from './components/bottom-nav';
import { Router } from './router';

async function bootstrap() {
  const app = document.getElementById('app');
  if (!app) return;

  // Initialize Theme
  ThemeManager.init();

  // Register PWA Service Worker for offline support
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(
        (registration) => {
          console.log('ServiceWorker registered successfully with scope:', registration.scope);
        },
        (err) => {
          console.log('ServiceWorker registration failed:', err);
        }
      );
    });
  }

  // Initialize Search Modal
  SearchModal.init();

  // Create layout components
  const navbar = createNavbar(() => {
    Sidebar.toggleDrawer();
  });

  const { sidebar, backdrop } = await Sidebar.create();

  const bodyWrapper = document.createElement('div');
  bodyWrapper.className = 'app-body';

  const mainContent = document.createElement('main');
  mainContent.id = 'main-content';
  mainContent.className = 'main-wrapper';
  mainContent.setAttribute('role', 'main');

  const bottomNav = createBottomNav();

  // Assemble App Shell
  bodyWrapper.appendChild(sidebar);
  bodyWrapper.appendChild(mainContent);

  app.appendChild(navbar);
  app.appendChild(bodyWrapper);
  app.appendChild(backdrop);
  app.appendChild(bottomNav);

  // Initialize Search Index in background
  SearchIndexManager.init().catch((err) => {
    console.error('Error initializing search index:', err);
  });

  // Start Router
  Router.init(mainContent);
}

// Start application
bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
});
