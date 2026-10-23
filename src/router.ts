import { renderHomePage } from './pages/home';
import { renderTopicsListPage } from './pages/topics-list';
import { renderTopicDetailPage } from './pages/topic-detail';
import { renderQABankPage } from './pages/qa-bank';
import { renderProjectsListPage } from './pages/projects-list';
import { renderProjectDetailPage } from './pages/project-detail';
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
      pageElement = renderPlaceholderPage('Boşluqlar & Strategiya', 'M6', 'Təcrübədə olmayan sahələr üzrə dürüst və güclü cavab strategiyaları.');
    } else if (path === '/scenarios') {
      pageElement = renderPlaceholderPage('Real Ssenarilər', 'M6', '10+ real memarlıq və istehsalat ssenarisi üzrə addım-addım həllər.');
    } else if (path === '/sql-practice') {
      pageElement = renderPlaceholderPage('SQL Məşq', 'M6', 'T-SQL və PostgreSQL üçün 20+ praktik SQL tapşırığı.');
    } else if (path === '/cheatsheets') {
      pageElement = renderPlaceholderPage('Konspektlər', 'M7', 'Çap üçün hazır sintaksis və müqayisə cədvəlləri.');
    } else if (path === '/behavioral') {
      pageElement = renderPlaceholderPage('Davranış & STAR', 'M6', 'Özünü təqdimat, STAR hekayələri və müsahibəçiyə veriləcək suallar.');
    } else if (path === '/glossary') {
      pageElement = renderPlaceholderPage('Terminlər Lüğəti', 'M7', '100+ Data Engineering termini üzrə qısa izahlar.');
    } else if (path === '/mock') {
      pageElement = renderPlaceholderPage('Sınaq Müsahibəsi', 'M7', '10 təsadüfi sualdan ibarət interaktiv müsahibə simulyasiyası.');
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
