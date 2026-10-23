import { ContentLoader } from '../content-loader';
import { GlossaryTerm } from '../types';

export async function renderGlossaryPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container glossary-page';

  const terms = await ContentLoader.getGlossary();
  let searchQuery = '';

  function getFiltered(): GlossaryTerm[] {
    if (!searchQuery.trim()) return terms;
    const q = searchQuery.toLowerCase().trim();
    return terms.filter(t => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
  }

  function renderList(): void {
    const listEl = container.querySelector('#glossary-list');
    if (!listEl) return;

    const filtered = getFiltered();
    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-qa-card">
          <p>"${searchQuery}" sorğusuna uyğun heç bir termin tapılmadı.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="glossary-grid">
        ${filtered.map(t => `
          <div class="glossary-card" id="term-${encodeURIComponent(t.term)}">
            <div class="glossary-card-header">
              <h3 class="glossary-term-title">${t.term}</h3>
              <button type="button" class="btn-copy-term" title="Termini kopyala" data-term="${t.term}">
                <span>⎘</span>
              </button>
            </div>
            <p class="glossary-def-text">${t.definition}</p>
          </div>
        `).join('')}
      </div>
    `;

    listEl.querySelectorAll('.btn-copy-term').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = (e.currentTarget as HTMLElement).dataset.term || '';
        navigator.clipboard.writeText(text).then(() => {
          btn.classList.add('copied');
          btn.innerHTML = '<span>✓</span>';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<span>⎘</span>';
          }, 1500);
        });
      });
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="breadcrumbs">
        <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">Terminlər Lüğəti</span>
      </div>
      <h1 class="page-title">Data Mühəndisliyi Terminlər Lüğəti (Glossary)</h1>
      <p class="page-desc">
        Müsahibədə ən çox qarşılaşacağın 40 əsas texnoloji və memarlıq termininin sadə dildə qısa tərifi.
      </p>
    </div>

    <div class="qa-controls-card">
      <div class="glossary-search-box">
        <span class="search-input-icon">🔍</span>
        <input 
          type="text" 
          id="glossary-search-input" 
          class="glossary-search-input" 
          placeholder="Termin və ya izah üzrə axtarış et... (məsələn: CDC, ACID, Idempotency)" 
          autocomplete="off"
        />
        <span class="glossary-count-badge">${terms.length} termin</span>
      </div>
    </div>

    <div id="glossary-list"></div>
  `;

  const inputEl = container.querySelector('#glossary-search-input') as HTMLInputElement;
  inputEl?.addEventListener('input', () => {
    searchQuery = inputEl.value;
    renderList();
  });

  renderList();

  return container;
}
