import { HeadingItem } from '../types';

export class TableOfContents {
  private static observer: IntersectionObserver | null = null;

  public static create(headings: HeadingItem[]): HTMLElement | null {
    if (headings.length === 0) return null;

    const nav = document.createElement('nav');
    nav.className = 'page-toc';
    nav.setAttribute('aria-label', 'Bu səhifədə');

    let linksHtml = '';
    headings.forEach((h) => {
      const indentClass = h.level === 3 ? 'toc-sub-item' : 'toc-main-item';
      linksHtml += `
        <li>
          <a href="#${h.id}" class="toc-link ${indentClass}" data-heading="${h.id}">
            ${h.text}
          </a>
        </li>
      `;
    });

    nav.innerHTML = `
      <div class="toc-container">
        <h3 class="toc-title">Bu səhifədə</h3>
        <ul class="toc-list">
          ${linksHtml}
        </ul>
      </div>
    `;

    // Smooth scroll and focus
    nav.querySelectorAll('.toc-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-heading');
        if (!targetId) return;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', `#${window.location.hash.split('#')[1] || ''}`);
        }
      });
    });

    // Setup intersection observer
    this.setupObserver(headings);

    return nav;
  }

  private static setupObserver(headings: HeadingItem[]): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    const headingElements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            document.querySelectorAll('.toc-link').forEach((link) => {
              if (link.getAttribute('data-heading') === id) {
                link.classList.add('active');
              } else {
                link.classList.remove('active');
              }
            });
          }
        });
      },
      {
        rootMargin: '0px 0px -70% 0px',
        threshold: 0
      }
    );

    headingElements.forEach((el) => this.observer?.observe(el));
  }

  public static destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
