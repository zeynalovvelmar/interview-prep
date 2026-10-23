import { ContentLoader } from '../content-loader';
import { ProgressManager } from '../state/progress';
import { Topic } from '../types';

export class Sidebar {
  private static element: HTMLElement | null = null;
  private static backdrop: HTMLElement | null = null;
  private static topics: Topic[] = [];

  public static async create(onNavigate?: () => void): Promise<{ sidebar: HTMLElement; backdrop: HTMLElement }> {
    this.topics = await ContentLoader.getTopics();

    const aside = document.createElement('aside');
    aside.className = 'site-sidebar';
    aside.id = 'site-sidebar';
    aside.setAttribute('aria-label', 'Sayt Naviqasiyası');

    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.id = 'sidebar-backdrop';

    this.element = aside;
    this.backdrop = backdrop;

    this.render(onNavigate);

    // Re-render when progress updates to show updated checkmarks
    window.addEventListener('progress-updated', () => {
      this.updateProgressBadges();
    });

    // Close on backdrop click
    backdrop.addEventListener('click', () => {
      this.closeDrawer();
    });

    return { sidebar: aside, backdrop };
  }

  public static openDrawer(): void {
    this.element?.classList.add('drawer-open');
    this.backdrop?.classList.add('backdrop-active');
    document.body.style.overflow = 'hidden';
  }

  public static closeDrawer(): void {
    this.element?.classList.remove('drawer-open');
    this.backdrop?.classList.remove('backdrop-active');
    document.body.style.overflow = '';
  }

  public static toggleDrawer(): void {
    if (this.element?.classList.contains('drawer-open')) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  public static updateActiveLink(currentHash: string): void {
    if (!this.element) return;
    const links = this.element.querySelectorAll('a.nav-item, a.topic-sub-item');
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href === currentHash || (href !== '#/' && currentHash.startsWith(href))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  private static updateProgressBadges(): void {
    if (!this.element) return;
    this.topics.forEach((t) => {
      const isLearned = ProgressManager.isTopicLearned(t.slug);
      const badge = this.element?.querySelector(`.topic-status-${t.slug}`);
      if (badge) {
        badge.className = `topic-sub-status topic-status-${t.slug} ${isLearned ? 'is-learned' : ''}`;
        badge.innerHTML = isLearned ? '✓' : '○';
      }
    });
  }

  private static render(onNavigate?: () => void): void {
    if (!this.element) return;

    let topicsListHtml = '';
    this.topics.forEach((t, idx) => {
      const isLearned = ProgressManager.isTopicLearned(t.slug);
      topicsListHtml += `
        <li>
          <a href="#/topics/${t.slug}" class="topic-sub-item" data-slug="${t.slug}">
            <span class="topic-sub-num">${idx + 1}.</span>
            <span class="topic-sub-title">${t.title}</span>
            <span class="topic-sub-status topic-status-${t.slug} ${isLearned ? 'is-learned' : ''}">${isLearned ? '✓' : '○'}</span>
          </a>
        </li>
      `;
    });

    this.element.innerHTML = `
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <div class="sidebar-user-card">
            <div class="user-avatar">E</div>
            <div class="user-info">
              <span class="user-name">Elmar</span>
              <span class="user-role">Junior Data Engineer</span>
            </div>
          </div>
          <button type="button" class="drawer-close-btn" aria-label="Menyunu bağla">✕</button>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-group">
            <span class="nav-group-title">Əsas Bölmələr</span>
            <ul class="nav-list">
              <li>
                <a href="#/" class="nav-item">
                  <span class="nav-icon">🏠</span>
                  <span class="nav-text">Ana Səhifə</span>
                </a>
              </li>
              <li>
                <a href="#/topics" class="nav-item">
                  <span class="nav-icon">📚</span>
                  <span class="nav-text">Mövzular</span>
                </a>
                <ul class="topic-sub-list">
                  ${topicsListHtml}
                </ul>
              </li>
              <li>
                <a href="#/qa" class="nav-item">
                  <span class="nav-icon">❓</span>
                  <span class="nav-text">Sual-Cavab Bankı</span>
                  <span class="nav-badge">150+</span>
                </a>
              </li>
              <li>
                <a href="#/projects" class="nav-item">
                  <span class="nav-icon">🚀</span>
                  <span class="nav-text">CV Layihələri</span>
                  <span class="nav-badge">3</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="nav-group">
            <span class="nav-group-title">Müsahibə Taktikası</span>
            <ul class="nav-list">
              <li>
                <a href="#/gaps" class="nav-item">
                  <span class="nav-icon">🎯</span>
                  <span class="nav-text">Boşluqlar & Strategiya</span>
                </a>
              </li>
              <li>
                <a href="#/scenarios" class="nav-item">
                  <span class="nav-icon">🏗️</span>
                  <span class="nav-text">Real Ssenarilər</span>
                </a>
              </li>
              <li>
                <a href="#/sql-practice" class="nav-item">
                  <span class="nav-icon">💻</span>
                  <span class="nav-text">SQL Məşq</span>
                </a>
              </li>
              <li>
                <a href="#/cheatsheets" class="nav-item">
                  <span class="nav-icon">📋</span>
                  <span class="nav-text">Konspektlər</span>
                </a>
              </li>
              <li>
                <a href="#/behavioral" class="nav-item">
                  <span class="nav-icon">🤝</span>
                  <span class="nav-text">Davranış & STAR</span>
                </a>
              </li>
              <li>
                <a href="#/glossary" class="nav-item">
                  <span class="nav-icon">📖</span>
                  <span class="nav-text">Terminlər Lüğəti</span>
                </a>
              </li>
              <li>
                <a href="#/mock" class="nav-item">
                  <span class="nav-icon">⏱️</span>
                  <span class="nav-text">Sınaq Müsahibəsi</span>
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="vacancy-tag">
            <span class="vacancy-bullet"></span>
            <span>Atəşgah Sığorta Şirkəti</span>
          </div>
        </div>
      </div>
    `;

    // Drawer close button
    this.element.querySelector('.drawer-close-btn')?.addEventListener('click', () => {
      this.closeDrawer();
    });

    // Close drawer when any link is clicked on mobile
    this.element.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        this.closeDrawer();
        if (onNavigate) onNavigate();
      });
    });
  }
}
