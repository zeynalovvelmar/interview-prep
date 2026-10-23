import { SearchIndexManager } from '../search/search-index';
import { SearchItem } from '../types';

export class SearchModal {
  private static dialog: HTMLDialogElement | null = null;
  private static input: HTMLInputElement | null = null;
  private static resultsContainer: HTMLElement | null = null;
  private static activeIndex = -1;
  private static currentResults: SearchItem[] = [];

  public static init(): void {
    if (this.dialog) return;

    // Create dialog element with closedby="any"
    const dialog = document.createElement('dialog');
    dialog.id = 'search-modal';
    dialog.className = 'search-dialog';
    dialog.setAttribute('closedby', 'any');
    dialog.setAttribute('aria-label', 'Qlobal Axtarış');

    dialog.innerHTML = `
      <div class="search-modal-container">
        <div class="search-header">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="search" 
            id="global-search-input" 
            class="search-input" 
            placeholder="Mövzu, sual və ya termin axtar... (Məs: Buffer Pool, CDC, Spark)" 
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="search-close-btn" aria-label="Bağla">ESC</button>
        </div>
        <div class="search-results-wrapper" id="search-results" role="listbox">
          <div class="search-empty-state">
            <p>Axtarmaq üçün söz yazın və ya oxumağa başlamaq üçün mövzu seçin.</p>
            <div class="search-quick-tags">
              <span class="quick-tag" data-tag="SQL Server">SQL Server</span>
              <span class="quick-tag" data-tag="PostgreSQL">PostgreSQL</span>
              <span class="quick-tag" data-tag="Miqrasiya">Miqrasiya</span>
              <span class="quick-tag" data-tag="Lakehouse">Lakehouse</span>
              <span class="quick-tag" data-tag="Airflow">Airflow</span>
            </div>
          </div>
        </div>
        <div class="search-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> Keçid</span>
          <span><kbd>Enter</kbd> Seçmək</span>
          <span><kbd>Esc</kbd> Bağlamaq</span>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    this.dialog = dialog;
    this.input = dialog.querySelector('#global-search-input');
    this.resultsContainer = dialog.querySelector('#search-results');

    // Fallback for browsers that do not support <dialog closedby>
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (!isDialogContent) {
          dialog.close();
        }
      });
    }

    // Close button
    dialog.querySelector('.search-close-btn')?.addEventListener('click', () => {
      dialog.close();
    });

    // Input listener
    this.input?.addEventListener('input', () => {
      this.handleSearch();
    });

    // Keyboard navigation inside input
    this.input?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateResults(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateResults(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.selectActiveResult();
      }
    });

    // Quick tag clicks
    dialog.addEventListener('click', (e) => {
      const tag = (e.target as HTMLElement).closest('.quick-tag') as HTMLElement;
      if (tag && tag.dataset.tag && this.input) {
        this.input.value = tag.dataset.tag;
        this.handleSearch();
      }
    });

    // Global keyboard shortcut ('/' or 'Ctrl+K' / 'Cmd+K')
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        this.open();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.open();
      }
    });
  }

  public static open(): void {
    if (!this.dialog) this.init();
    if (this.dialog && !this.dialog.open) {
      this.dialog.showModal();
      setTimeout(() => {
        this.input?.focus();
        this.input?.select();
      }, 50);
    }
  }

  public static close(): void {
    if (this.dialog?.open) {
      this.dialog.close();
    }
  }

  private static handleSearch(): void {
    const query = this.input?.value.trim() || '';
    if (!query) {
      this.renderEmptyState();
      return;
    }

    const results = SearchIndexManager.search(query);
    this.currentResults = results.slice(0, 10);
    this.activeIndex = this.currentResults.length > 0 ? 0 : -1;
    this.renderResults();
  }

  private static renderEmptyState(): void {
    if (!this.resultsContainer) return;
    this.currentResults = [];
    this.activeIndex = -1;
    this.resultsContainer.innerHTML = `
      <div class="search-empty-state">
        <p>Axtarmaq üçün söz yazın və ya oxumağa başlamaq üçün mövzu seçin.</p>
        <div class="search-quick-tags">
          <span class="quick-tag" data-tag="SQL Server">SQL Server</span>
          <span class="quick-tag" data-tag="PostgreSQL">PostgreSQL</span>
          <span class="quick-tag" data-tag="Miqrasiya">Miqrasiya</span>
          <span class="quick-tag" data-tag="Lakehouse">Lakehouse</span>
          <span class="quick-tag" data-tag="Airflow">Airflow</span>
        </div>
      </div>
    `;
  }

  private static renderResults(): void {
    if (!this.resultsContainer) return;

    if (this.currentResults.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="search-no-results">
          <p>Uyğun nəticə tapılmadı. Sorğunu dəqiqləşdirin.</p>
        </div>
      `;
      return;
    }

    let html = '<div class="search-results-list">';
    this.currentResults.forEach((item, index) => {
      const isSelected = index === this.activeIndex ? 'selected' : '';
      const badgeClass = item.type === 'topic' ? 'badge-topic' : item.type === 'question' ? 'badge-qa' : 'badge-glossary';

      html += `
        <div class="search-item ${isSelected}" data-index="${index}" data-url="${item.url}" role="option">
          <div class="search-item-header">
            <span class="search-item-badge ${badgeClass}">${item.badge || item.type}</span>
            <span class="search-item-cat">${item.category}</span>
          </div>
          <div class="search-item-title">${item.title}</div>
          <div class="search-item-snippet">${item.content.slice(0, 140)}...</div>
        </div>
      `;
    });
    html += '</div>';

    this.resultsContainer.innerHTML = html;

    // Attach click events
    this.resultsContainer.querySelectorAll('.search-item').forEach((el) => {
      el.addEventListener('click', () => {
        const url = (el as HTMLElement).dataset.url;
        if (url) {
          window.location.hash = url.replace('#', '');
          this.close();
        }
      });
    });
  }

  private static navigateResults(delta: number): void {
    if (this.currentResults.length === 0) return;
    this.activeIndex = (this.activeIndex + delta + this.currentResults.length) % this.currentResults.length;
    
    const items = this.resultsContainer?.querySelectorAll('.search-item');
    items?.forEach((item, idx) => {
      if (idx === this.activeIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  private static selectActiveResult(): void {
    if (this.activeIndex >= 0 && this.activeIndex < this.currentResults.length) {
      const selected = this.currentResults[this.activeIndex];
      window.location.hash = selected.url.replace('#', '');
      this.close();
    }
  }
}
