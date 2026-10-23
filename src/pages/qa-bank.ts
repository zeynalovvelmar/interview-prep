import { ContentLoader } from '../content-loader';
import { ProgressManager } from '../state/progress';
import { Question, QuestionStatus } from '../types';
import { enhanceCodeBlocks } from '../components/code-block';

export async function renderQABankPage(targetId?: string): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container qa-page';

  const questions = await ContentLoader.getQuestions();
  const categories = Array.from(new Set(questions.map(q => q.category)));

  // State
  let selectedCategory = 'all';
  let selectedDifficulty = 'all';
  let selectedStatus = 'all';
  let hideAllAnswers = false;

  function getFilteredQuestions(): Question[] {
    return questions.filter(q => {
      if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      if (selectedStatus !== 'all') {
        const status = ProgressManager.getQuestionStatus(q.id);
        if (selectedStatus === 'none' && status !== 'none') return false;
        if (selectedStatus !== 'none' && status !== selectedStatus) return false;
      }
      return true;
    });
  }

  function renderList(): void {
    const listContainer = container.querySelector('#qa-questions-list');
    if (!listContainer) return;

    const filtered = getFilteredQuestions();

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-qa-card">
          <p>Seçilmiş filtrlərə uyğun heç bir sual tapılmadı.</p>
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach((q) => {
      const status = ProgressManager.getQuestionStatus(q.id);
      const isKnown = status === 'bilirem';
      const isReview = status === 'tekrar';

      const diffClass = q.difficulty === 'Easy' ? 'diff-easy' : q.difficulty === 'Medium' ? 'diff-medium' : 'diff-hard';

      let codeHtml = '';
      if (q.code) {
        codeHtml = `
          <div class="qa-code-box">
            <pre><code class="language-${q.code.language}">-- Dialect: ${q.code.dialect || q.code.language}\n${q.code.snippet}</code></pre>
          </div>
        `;
      }

      let followUpsHtml = '';
      if (q.followUps && q.followUps.length > 0) {
        followUpsHtml = `
          <div class="qa-followups">
            <strong>Müsahibəçinin mümkün əlavə sualları (Follow-ups):</strong>
            <ul>
              ${q.followUps.map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      html += `
        <div class="qa-card ${isKnown ? 'qa-card-known' : ''} ${isReview ? 'qa-card-review' : ''}" id="${q.id}" data-id="${q.id}">
          <div class="qa-card-header">
            <div class="qa-meta">
              <span class="qa-category-badge">${q.category}</span>
              <span class="qa-diff-badge ${diffClass}">${q.difficulty}</span>
            </div>

            <div class="qa-status-actions">
              <button 
                type="button" 
                class="status-btn btn-known ${isKnown ? 'active' : ''}" 
                data-id="${q.id}" 
                data-status="bilirem"
                title="Bilirəm"
              >
                <span>✓ Bilirəm</span>
              </button>
              <button 
                type="button" 
                class="status-btn btn-review ${isReview ? 'active' : ''}" 
                data-id="${q.id}" 
                data-status="tekrar"
                title="Təkrar lazımdır"
              >
                <span>↺ Təkrar lazımdır</span>
              </button>
            </div>
          </div>

          <h3 class="qa-question-text">${q.question}</h3>

          <details class="qa-answer-details" ${hideAllAnswers ? '' : 'open'}>
            <summary class="qa-answer-summary">
              <span class="qa-reveal-text">Model Cavab</span>
              <span class="qa-arrow">▾</span>
            </summary>
            <div class="qa-answer-body">
              <p class="qa-answer-p">${q.answer}</p>
              ${codeHtml}
              ${followUpsHtml}
            </div>
          </details>
        </div>
      `;
    });

    listContainer.innerHTML = html;

    // Enhance code blocks inside questions
    enhanceCodeBlocks(listContainer as HTMLElement);

    // Attach status toggle listeners
    listContainer.querySelectorAll('.status-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetBtn = (e.currentTarget as HTMLElement);
        const qId = targetBtn.dataset.id;
        const targetStatus = targetBtn.dataset.status as QuestionStatus;
        if (!qId) return;

        const currentStatus = ProgressManager.getQuestionStatus(qId);
        const newStatus = currentStatus === targetStatus ? 'none' : targetStatus;
        ProgressManager.setQuestionStatus(qId, newStatus);
        renderList();
      });
    });

    // If targetId was passed, scroll to it
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-target');
          const details = el.querySelector('details');
          if (details) details.open = true;
        }
      }, 100);
    }
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="breadcrumbs">
        <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">Sual-Cavab Bankı</span>
      </div>
      <h1 class="page-title">Sual-Cavab Məşq Bankı</h1>
      <p class="page-desc">
        Atəşgah Sığorta Şirkətində ən çox verilə biləcək texniki və konseptual suallar. Cavabları gizlədib özünü yoxla.
      </p>
    </div>

    <!-- Controls & Filters Bar -->
    <div class="qa-controls-card">
      <div class="qa-filters-row">
        <!-- Category Filter -->
        <div class="filter-group">
          <label for="filter-category" class="filter-label">Kateqoriya:</label>
          <select id="filter-category" class="select-control">
            <option value="all">Bütün kateqoriyalar (${questions.length})</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>

        <!-- Difficulty Filter -->
        <div class="filter-group">
          <label for="filter-difficulty" class="filter-label">Çətinlik:</label>
          <select id="filter-difficulty" class="select-control">
            <option value="all">Bütün səviyyələr</option>
            <option value="Easy">Sadə (Easy)</option>
            <option value="Medium">Orta (Medium)</option>
            <option value="Hard">Çətin (Hard)</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div class="filter-group">
          <label for="filter-status" class="filter-label">Status:</label>
          <select id="filter-status" class="select-control">
            <option value="all">Hamısı</option>
            <option value="bilirem">✓ Bilirəm</option>
            <option value="tekrar">↺ Təkrar lazımdır</option>
            <option value="none">Baxılmayıb</option>
          </select>
        </div>
      </div>

      <div class="qa-actions-row">
        <button type="button" class="btn btn-sm btn-outline" id="btn-toggle-all-answers">
          <span id="toggle-all-text">Cavabları Gizlət</span>
        </button>
        <button type="button" class="btn btn-sm btn-primary" id="btn-random-question">
          <span>🎲 Təsadüfi Sual</span>
        </button>
      </div>
    </div>

    <!-- Questions List -->
    <div class="qa-list-container" id="qa-questions-list"></div>
  `;

  // Attach control listeners
  const catSelect = container.querySelector('#filter-category') as HTMLSelectElement;
  catSelect?.addEventListener('change', () => {
    selectedCategory = catSelect.value;
    renderList();
  });

  const diffSelect = container.querySelector('#filter-difficulty') as HTMLSelectElement;
  diffSelect?.addEventListener('change', () => {
    selectedDifficulty = diffSelect.value;
    renderList();
  });

  const statusSelect = container.querySelector('#filter-status') as HTMLSelectElement;
  statusSelect?.addEventListener('change', () => {
    selectedStatus = statusSelect.value;
    renderList();
  });

  const toggleAllBtn = container.querySelector('#btn-toggle-all-answers');
  const toggleAllText = container.querySelector('#toggle-all-text');
  toggleAllBtn?.addEventListener('click', () => {
    hideAllAnswers = !hideAllAnswers;
    if (toggleAllText) {
      toggleAllText.textContent = hideAllAnswers ? 'Cavabları Göstər' : 'Cavabları Gizlət';
    }
    renderList();
  });

  const randomBtn = container.querySelector('#btn-random-question');
  randomBtn?.addEventListener('click', () => {
    const filtered = getFilteredQuestions();
    if (filtered.length > 0) {
      const randomIndex = Math.floor(Math.random() * filtered.length);
      const chosen = filtered[randomIndex];
      const el = document.getElementById(chosen.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-target');
        setTimeout(() => el.classList.remove('highlight-target'), 2500);
        const details = el.querySelector('details');
        if (details) details.open = true;
      }
    }
  });

  // Initial render
  renderList();

  return container;
}
