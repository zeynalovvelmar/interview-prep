import { ContentLoader } from '../content-loader';
import { SqlPracticeItem } from '../types';
import { enhanceCodeBlocks } from '../components/code-block';
import { initDialectTabs } from '../components/dialect-tabs';

export async function renderSqlPracticePage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container sql-practice-page';

  const exercises = await ContentLoader.getSqlPractice();
  const categories = Array.from(new Set(exercises.map(e => e.category)));

  let selectedCategory = 'all';
  let selectedDifficulty = 'all';

  function getFiltered(): SqlPracticeItem[] {
    return exercises.filter(e => {
      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
      if (selectedDifficulty !== 'all' && e.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }

  function renderList(): void {
    const listEl = container.querySelector('#sql-exercises-list');
    if (!listEl) return;

    const filtered = getFiltered();
    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-qa-card">
          <p>Seçilmiş filtrlərə uyğun SQL tapşırığı tapılmadı.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map((ex, idx) => {
      const diffClass = ex.difficulty === 'Easy' ? 'diff-easy' : ex.difficulty === 'Medium' ? 'diff-medium' : 'diff-hard';

      return `
        <div class="qa-card sql-exercise-card" id="${ex.id}">
          <div class="qa-card-header">
            <div class="qa-meta">
              <span class="qa-category-badge">${ex.category}</span>
              <span class="qa-diff-badge ${diffClass}">${ex.difficulty}</span>
              <span class="sql-index-badge">Tapşırıq #${idx + 1}</span>
            </div>
          </div>

          <h3 class="qa-question-text">${ex.title}</h3>
          <p class="sql-desc-text">${ex.description}</p>

          <div class="sql-data-preview-grid">
            <div class="sql-preview-box">
              <div class="sql-preview-header">Giriş Cədvəli & Nümunə:</div>
              <pre class="sql-preview-code"><code>${ex.sampleData}</code></pre>
            </div>
            <div class="sql-preview-box">
              <div class="sql-preview-header">Gözlənilən Nəticə:</div>
              <pre class="sql-preview-code"><code>${ex.expectedOutput}</code></pre>
            </div>
          </div>

          <details class="qa-answer-details" style="margin-top: 1.25rem;">
            <summary class="qa-answer-summary">
              <span class="qa-reveal-text">Həlli Göstər (T-SQL & PostgreSQL)</span>
              <span class="qa-arrow">▾</span>
            </summary>
            <div class="qa-answer-body">
              <div class="dialect-tabs-container">
                <div class="dialect-tabs-nav" role="tablist">
                  <button type="button" class="dialect-tab-btn active" data-tab-target="tab-${ex.id}-tsql">T-SQL (SQL Server)</button>
                  <button type="button" class="dialect-tab-btn" data-tab-target="tab-${ex.id}-pg">PostgreSQL</button>
                </div>
                <div class="dialect-tabs-body">
                  <div class="dialect-tab-pane active" data-tab-panel="tab-${ex.id}-tsql">
                    <pre><code class="language-sql">${ex.solutionTSQL}</code></pre>
                  </div>
                  <div class="dialect-tab-pane" data-tab-panel="tab-${ex.id}-pg">
                    <pre><code class="language-sql">${ex.solutionPostgres}</code></pre>
                  </div>
                </div>
              </div>

              <div class="callout callout-note" style="margin-top: 1rem;">
                <div class="callout-header"><span class="callout-icon">💡</span><strong>Mühəndislik İzahı:</strong></div>
                <div class="callout-body"><p>${ex.explanation}</p></div>
              </div>
            </div>
          </details>
        </div>
      `;
    }).join('');

    enhanceCodeBlocks(listEl as HTMLElement);
    initDialectTabs(listEl as HTMLElement);
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="breadcrumbs">
        <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">SQL Məşq</span>
      </div>
      <h1 class="page-title">SQL Praktik Məşq Bankı (10 Əsas Tapşırıq)</h1>
      <p class="page-desc">
        Data Mühəndisliyi müsahibələrində ən çox verilən 10 real SQL məsələsi. Hər tapşırıq üçün həm Microsoft SQL Server (T-SQL), 
        həm də PostgreSQL həlli təqdim olunur.
      </p>
    </div>

    <div class="qa-controls-card">
      <div class="qa-filters-row">
        <div class="filter-group">
          <label for="filter-sql-category" class="filter-label">Kateqoriya:</label>
          <select id="filter-sql-category" class="select-control">
            <option value="all">Bütün kateqoriyalar (${exercises.length})</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>

        <div class="filter-group">
          <label for="filter-sql-diff" class="filter-label">Çətinlik:</label>
          <select id="filter-sql-diff" class="select-control">
            <option value="all">Bütün səviyyələr</option>
            <option value="Easy">Sadə (Easy)</option>
            <option value="Medium">Orta (Medium)</option>
            <option value="Hard">Çətin (Hard)</option>
          </select>
        </div>
      </div>
    </div>

    <div class="qa-questions-container" id="sql-exercises-list"></div>
  `;

  const catSelect = container.querySelector('#filter-sql-category') as HTMLSelectElement;
  catSelect?.addEventListener('change', () => {
    selectedCategory = catSelect.value;
    renderList();
  });

  const diffSelect = container.querySelector('#filter-sql-diff') as HTMLSelectElement;
  diffSelect?.addEventListener('change', () => {
    selectedDifficulty = diffSelect.value;
    renderList();
  });

  renderList();

  return container;
}
