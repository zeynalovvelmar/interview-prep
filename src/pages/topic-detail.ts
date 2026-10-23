import { ContentLoader } from '../content-loader';
import { ProgressManager } from '../state/progress';
import { TableOfContents } from '../components/toc';
import { enhanceCodeBlocks } from '../components/code-block';

export async function renderTopicDetailPage(slug: string): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container topic-detail-page';

  const [topic, allTopics] = await Promise.all([
    ContentLoader.getTopicBySlug(slug),
    ContentLoader.getTopics()
  ]);

  if (!topic) {
    container.innerHTML = `
      <div class="not-found-card">
        <h2>Mövzu tapılmadı</h2>
        <p>"${slug}" adlı mövzu mövcud deyil və ya ünvan səhv daxil edilib.</p>
        <a href="#/topics" class="btn btn-primary">Mövzulara qayıt</a>
      </div>
    `;
    return container;
  }

  const isLearned = ProgressManager.isTopicLearned(topic.slug);
  const currentIndex = allTopics.findIndex(t => t.slug === topic.slug);
  const prevTopic = currentIndex > 0 ? allTopics[currentIndex - 1] : null;
  const nextTopic = currentIndex < allTopics.length - 1 ? allTopics[currentIndex + 1] : null;

  const priorityLabel = topic.priority === 'high' ? 'Kritik / Yüksək' : topic.priority === 'medium' ? 'Orta' : 'Aşağı';
  const readinessLabel = topic.readiness === 'guclu' ? 'Güclü' : topic.readiness === 'orta' ? 'Orta' : 'Öyrənməliyəm';

  container.innerHTML = `
    <div class="topic-layout">
      <!-- Main reading article -->
      <article class="topic-content-wrapper">
        <div class="topic-header">
          <div class="breadcrumbs">
            <a href="#/">Ana Səhifə</a> <span class="sep">/</span> 
            <a href="#/topics">Mövzular</a> <span class="sep">/</span> 
            <span class="current">${topic.title}</span>
          </div>

          <div class="topic-meta-row">
            <div class="topic-badges">
              <span class="badge badge-priority-${topic.priority}">${priorityLabel}</span>
              <span class="readiness-badge readiness-${topic.readiness}">${readinessLabel}</span>
              <span class="topic-category-tag">${topic.category}</span>
            </div>

            <button type="button" class="btn-toggle-learned ${isLearned ? 'learned' : ''}" id="btn-toggle-learned" aria-label="Mövzunu öyrənildi kimi qeyd et">
              <span class="check-icon">${isLearned ? '✓' : '○'}</span>
              <span class="check-label">${isLearned ? 'Öyrənildi' : 'Öyrənildi kimi qeyd et'}</span>
            </button>
          </div>

          ${topic.vacancyLink ? `
            <div class="topic-vacancy-callout">
              <span class="vacancy-icon">📌</span>
              <div>
                <strong>Atəşgah Sığorta Vakansiya Tələbi:</strong>
                <span>${topic.vacancyLink}</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Rendered Markdown Body -->
        <div class="markdown-body" id="topic-markdown-body">
          ${topic.html}
        </div>

        <!-- Topic Pagination Footer -->
        <nav class="topic-pagination" aria-label="Mövzular arası keçid">
          ${prevTopic ? `
            <a href="#/topics/${prevTopic.slug}" class="pagination-btn prev-btn">
              <span class="pagination-sub">$\leftarrow$ Əvvəlki mövzu</span>
              <span class="pagination-title">${prevTopic.title}</span>
            </a>
          ` : '<div class="pagination-placeholder"></div>'}

          ${nextTopic ? `
            <a href="#/topics/${nextTopic.slug}" class="pagination-btn next-btn">
              <span class="pagination-sub">Növbəti mövzu $\rightarrow$</span>
              <span class="pagination-title">${nextTopic.title}</span>
            </a>
          ` : '<div class="pagination-placeholder"></div>'}
        </nav>
      </article>

      <!-- Desktop Sticky TOC -->
      <aside class="topic-toc-sidebar">
        <div id="topic-toc-container"></div>
      </aside>
    </div>
  `;

  // Attach code block enhancements
  const markdownBody = container.querySelector('#topic-markdown-body') as HTMLElement;
  if (markdownBody) {
    enhanceCodeBlocks(markdownBody);
  }

  // Attach desktop TOC
  const tocContainer = container.querySelector('#topic-toc-container');
  if (tocContainer && topic.headings.length > 0) {
    const tocEl = TableOfContents.create(topic.headings);
    if (tocEl) {
      tocContainer.appendChild(tocEl);
    }
  }

  // Attach learned toggle button
  const toggleBtn = container.querySelector('#btn-toggle-learned');
  toggleBtn?.addEventListener('click', () => {
    const nextState = ProgressManager.toggleTopicLearned(topic.slug);
    if (nextState) {
      toggleBtn.classList.add('learned');
      toggleBtn.querySelector('.check-icon')!.textContent = '✓';
      toggleBtn.querySelector('.check-label')!.textContent = 'Öyrənildi';
    } else {
      toggleBtn.classList.remove('learned');
      toggleBtn.querySelector('.check-icon')!.textContent = '○';
      toggleBtn.querySelector('.check-label')!.textContent = 'Öyrənildi kimi qeyd et';
    }
  });

  return container;
}
