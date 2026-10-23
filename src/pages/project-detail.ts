import { ContentLoader } from '../content-loader';
import { TableOfContents } from '../components/toc';
import { enhanceCodeBlocks } from '../components/code-block';
import { initDialectTabs } from '../components/dialect-tabs';

export async function renderProjectDetailPage(slug: string): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container project-detail-page';

  const [project, allProjects] = await Promise.all([
    ContentLoader.getProjectBySlug(slug),
    ContentLoader.getProjects()
  ]);

  if (!project) {
    container.innerHTML = `
      <div class="not-found-card">
        <h2>Layihə tapılmadı</h2>
        <p>"${slug}" adlı layihə mövcud deyil və ya ünvan səhv daxil edilib.</p>
        <a href="#/projects" class="btn btn-primary">Layihələr siyahısına qayıt</a>
      </div>
    `;
    return container;
  }

  const currentIndex = allProjects.findIndex(p => p.slug === project.slug);
  const prevProj = currentIndex > 0 ? allProjects[currentIndex - 1] : null;
  const nextProj = currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null;

  container.innerHTML = `
    <div class="topic-layout">
      <!-- Main project article -->
      <article class="topic-content-wrapper">
        <div class="topic-header">
          <div class="breadcrumbs">
            <a href="#/">Ana Səhifə</a> <span class="sep">/</span> 
            <a href="#/projects">CV Layihələri</a> <span class="sep">/</span> 
            <span class="current">${project.title}</span>
          </div>

          <div class="project-header-meta">
            <span class="project-date-badge">${project.date}</span>
            <span class="project-role-badge">Rol: ${project.role}</span>
          </div>

          <div class="project-tags-row" style="margin-top: 0.75rem;">
            ${project.tags.map(t => `<span class="project-tech-tag">${t}</span>`).join('')}
          </div>
        </div>

        <!-- Rendered Markdown Body -->
        <div class="markdown-body" id="project-markdown-body">
          ${project.html}
        </div>

        <!-- Project Pagination Footer -->
        <nav class="topic-pagination" aria-label="Layihələr arası keçid">
          ${prevProj ? `
            <a href="#/projects/${prevProj.slug}" class="pagination-btn prev-btn">
              <span class="pagination-sub">← Əvvəlki Layihə</span>
              <span class="pagination-title">${prevProj.title}</span>
            </a>
          ` : '<div class="pagination-placeholder"></div>'}

          ${nextProj ? `
            <a href="#/projects/${nextProj.slug}" class="pagination-btn next-btn">
              <span class="pagination-sub">Növbəti Layihə →</span>
              <span class="pagination-title">${nextProj.title}</span>
            </a>
          ` : '<div class="pagination-placeholder"></div>'}
        </nav>
      </article>

      <!-- Desktop Sticky TOC -->
      <aside class="topic-toc-sidebar">
        <div id="project-toc-container"></div>
      </aside>
    </div>
  `;

  // Attach code block enhancements & dialect tabs
  const markdownBody = container.querySelector('#project-markdown-body') as HTMLElement;
  if (markdownBody) {
    enhanceCodeBlocks(markdownBody);
    initDialectTabs(markdownBody);
  }

  // Attach desktop TOC
  const tocContainer = container.querySelector('#project-toc-container');
  if (tocContainer && project.headings.length > 0) {
    const tocEl = TableOfContents.create(project.headings);
    if (tocEl) {
      tocContainer.appendChild(tocEl);
    }
  }


  return container;
}
