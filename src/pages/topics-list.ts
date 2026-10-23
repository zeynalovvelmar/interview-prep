import { ContentLoader } from '../content-loader';
import { ProgressManager } from '../state/progress';

export async function renderTopicsListPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container topics-page';

  const topics = await ContentLoader.getTopics();

  let topicsCardsHtml = '';
  topics.forEach((t) => {
    const isLearned = ProgressManager.isTopicLearned(t.slug);
    const priorityLabel = t.priority === 'high' ? 'Kritik / Vacib' : t.priority === 'medium' ? 'Orta' : 'Aşağı';
    const priorityClass = `badge-priority-${t.priority}`;
    const readinessLabel = t.readiness === 'guclu' ? 'Güclü' : t.readiness === 'orta' ? 'Orta' : 'Öyrənməliyəm';
    const readinessClass = `readiness-${t.readiness}`;

    topicsCardsHtml += `
      <div class="topic-card ${isLearned ? 'is-learned' : ''}" data-slug="${t.slug}">
        <div class="topic-card-top">
          <div class="topic-badges">
            <span class="badge ${priorityClass}">${priorityLabel}</span>
            <span class="readiness-badge ${readinessClass}">${readinessLabel}</span>
            <span class="topic-category-tag">${t.category}</span>
          </div>

          <label class="topic-check-label" title="Öyrənildi kimi qeyd et" aria-label="${t.title} öyrənildi">
            <input type="checkbox" class="topic-learned-checkbox" data-slug="${t.slug}" ${isLearned ? 'checked' : ''} />
            <span class="topic-check-custom"></span>
            <span class="topic-check-text">Öyrənilib</span>
          </label>
        </div>

        <h2 class="topic-card-title">
          <a href="#/topics/${t.slug}" class="topic-title-link">${t.title}</a>
        </h2>

        <p class="topic-card-summary">${t.summary || 'Bu mövzu üzrə əsas nəzəriyyə, kod nümunələri və mini-testlər.'}</p>

        ${t.vacancyLink ? `
          <div class="topic-vacancy-link">
            <span class="vacancy-bullet-small"></span>
            <span>Vakansiya ilə əlaqə: <em>${t.vacancyLink}</em></span>
          </div>
        ` : ''}

        <div class="topic-card-footer">
          <div class="topic-tags">
            ${t.tags?.map(tag => `<span class="topic-tag">${tag}</span>`).join('') || ''}
          </div>
          <a href="#/topics/${t.slug}" class="btn btn-sm btn-outline">
            Oxu $\rightarrow$
          </a>
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="page-header">
      <div class="breadcrumbs">
        <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">Mövzular</span>
      </div>
      <h1 class="page-title">Müsahibə Hazırlığı Mövzuları</h1>
      <p class="page-desc">
        Atəşgah Sığorta Şirkətinin tələblərinə uyğunlaşdırılmış texniki dərslik və dərin təhlil materialları.
      </p>
    </div>

    <div class="topics-grid">
      ${topicsCardsHtml}
    </div>
  `;

  // Attach event listeners to checkboxes
  container.querySelectorAll('.topic-learned-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const slug = (e.target as HTMLInputElement).dataset.slug;
      if (!slug) return;
      const checked = (e.target as HTMLInputElement).checked;
      ProgressManager.setTopicLearned(slug, checked);
      const card = container.querySelector(`.topic-card[data-slug="${slug}"]`);
      if (card) {
        if (checked) card.classList.add('is-learned');
        else card.classList.remove('is-learned');
      }
    });
  });

  return container;
}
