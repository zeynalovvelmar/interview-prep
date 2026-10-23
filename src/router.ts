import { renderHomePage } from './pages/home';
import { renderTopicsListPage } from './pages/topics-list';
import { renderTopicDetailPage } from './pages/topic-detail';
import { renderQABankPage } from './pages/qa-bank';
import { renderProjectsListPage } from './pages/projects-list';
import { renderProjectDetailPage } from './pages/project-detail';
import { renderGapsPage } from './pages/gaps';
import { renderScenariosPage } from './pages/scenarios';
import { renderSqlPracticePage } from './pages/sql-practice';
import { renderBehavioralPage } from './pages/behavioral';
import { renderGlossaryPage } from './pages/glossary';
import { renderMockPage } from './pages/mock';
import { renderPlaceholderPage } from './pages/placeholder';
import { Sidebar } from './components/sidebar';
import { updateBottomNavActive } from './components/bottom-nav';
import { TableOfContents } from './components/toc';

export class Router {
  private static mainContent: HTMLElement | null = null;

  public static init(mainContent: HTMLElement): void {
    this.mainContent = mainContent;

    window.addEventListener('hashchange', () => {
      this.handleRoute();
    });

    this.handleRoute();
  }

  public static async handleRoute(): Promise<void> {
    if (!this.mainContent) return;

    // Clean up previous observers
    TableOfContents.destroy();

    const hash = window.location.hash || '#/';
    const [pathPart, queryPart] = hash.split('?');
    const path = pathPart.replace(/^#/, '') || '/';

    // Parse query params
    const queryParams = new URLSearchParams(queryPart || '');

    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Update active links in sidebar and bottom nav
    Sidebar.updateActiveLink(pathPart);
    updateBottomNavActive(pathPart);

    // Show quick skeleton or loading if needed
    this.mainContent.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

    let pageElement: HTMLElement;

    if (path === '/' || path === '') {
      pageElement = await renderHomePage();
    } else if (path === '/topics') {
      pageElement = await renderTopicsListPage();
    } else if (path.startsWith('/topics/')) {
      const slug = path.replace('/topics/', '');
      pageElement = await renderTopicDetailPage(slug);
    } else if (path === '/qa') {
      const targetId = queryParams.get('id') || undefined;
      pageElement = await renderQABankPage(targetId);
    } else if (path === '/projects') {
      pageElement = await renderProjectsListPage();
    } else if (path.startsWith('/projects/')) {
      const slug = path.replace('/projects/', '');
      pageElement = await renderProjectDetailPage(slug);
    } else if (path === '/gaps') {
      pageElement = await renderGapsPage();
    } else if (path === '/scenarios') {
      pageElement = await renderScenariosPage();
    } else if (path === '/sql-practice') {
      pageElement = await renderSqlPracticePage();
    } else if (path === '/cheatsheets') {
      pageElement = renderPlaceholderPage('Konspektlər', 'M7', 'Çap üçün hazır sintaksis və müqayisə cədvəlləri.');
    } else if (path === '/behavioral') {
      pageElement = await renderBehavioralPage();

    } else if (path === '/glossary') {
      pageElement = await renderGlossaryPage();
    } else if (path === '/mock') {
      pageElement = await renderMockPage();

    } else {
      // 404
      pageElement = document.createElement('div');
      pageElement.className = 'page-container not-found-page';
      pageElement.innerHTML = `
        <div class="not-found-card">
          <h2>404 — Səhifə tapılmadı</h2>
          <p>Axtardığınız səhifə mövcud deyil və ya ünvan dəyişdirilib.</p>
          <a href="#/" class="btn btn-primary">Ana Səhifəyə Qayıt</a>
        </div>
      `;
    }

    this.mainContent.innerHTML = '';
    this.mainContent.appendChild(pageElement);
  }
}
