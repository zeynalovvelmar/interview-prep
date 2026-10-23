import { ContentLoader } from '../content-loader';

export async function renderProjectsListPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container projects-list-page';

  const projects = await ContentLoader.getProjects();

  container.innerHTML = `
    <div class="page-header">
      <div class="breadcrumbs">
        <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">CV Layihələri</span>
      </div>
      <h1 class="page-title">CV Layihələri & Dərin Təhlil (Deep Dive)</h1>
      <p class="page-desc">
        Elmarın portfolioundakı 3 real mühəndislik layihəsi. Hər layihə üçün 60 saniyəlik pitch, 3 dəqiqəlik izah, 
        arxitektura diaqramı, memarlıq qərarları, 12-15 çətin sual-cavab və yadda saxlanacaq rəqəmlər.
      </p>
    </div>

    <div class="projects-grid">
      ${projects.map((proj, idx) => `
        <div class="project-card">
          <div class="project-card-header">
            <div class="project-badge-row">
              <span class="project-num-badge">Layihə #${idx + 1}</span>
              <span class="project-date-badge">${proj.date}</span>
            </div>
            <h2 class="project-card-title">
              <a href="#/projects/${proj.slug}">${proj.title}</a>
            </h2>
            <p class="project-card-subtitle">${proj.subtitle || ''}</p>
          </div>

          <div class="project-tags-row">
            ${proj.tags.map(t => `<span class="project-tech-tag">${t}</span>`).join('')}
          </div>

          <div class="project-card-footer">
            <a href="#/projects/${proj.slug}" class="btn btn-primary btn-block">
              <span>Layihənin Dərin Analizinə Bax</span>
              <span class="btn-arrow">→</span>
            </a>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  return container;
}
