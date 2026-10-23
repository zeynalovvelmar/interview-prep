import behavioralRaw from '../../content/behavioral.md?raw';
import { ContentLoader } from '../content-loader';
import { TableOfContents } from '../components/toc';
import { enhanceCodeBlocks } from '../components/code-block';
import { initDialectTabs } from '../components/dialect-tabs';

export async function renderBehavioralPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container behavioral-page';

  const { data, html, headings } = await ContentLoader.parseMarkdownDocument(behavioralRaw);

  container.innerHTML = `
    <div class="topic-layout">
      <article class="topic-content-wrapper">
        <div class="topic-header">
          <div class="breadcrumbs">
            <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">Davranış & STAR</span>
          </div>
          <h1 class="page-title">${data.title || 'Özünü Təqdimat, STAR & Suallar'}</h1>
          <p class="page-desc">${data.subtitle || ''}</p>
        </div>

        <div class="markdown-body" id="behavioral-markdown-body">
          ${html}
        </div>
      </article>

      <aside class="topic-toc-sidebar">
        <div id="behavioral-toc-container"></div>
      </aside>
    </div>
  `;

  const markdownBody = container.querySelector('#behavioral-markdown-body') as HTMLElement;
  if (markdownBody) {
    enhanceCodeBlocks(markdownBody);
    initDialectTabs(markdownBody);
  }

  const tocContainer = container.querySelector('#behavioral-toc-container');
  if (tocContainer && headings.length > 0) {
    const tocEl = TableOfContents.create(headings);
    if (tocEl) {
      tocContainer.appendChild(tocEl);
    }
  }

  return container;
}
