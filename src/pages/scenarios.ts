import scenariosRaw from '../../content/scenarios.md?raw';
import { ContentLoader } from '../content-loader';
import { TableOfContents } from '../components/toc';
import { enhanceCodeBlocks } from '../components/code-block';
import { initDialectTabs } from '../components/dialect-tabs';

export async function renderScenariosPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container scenarios-page';

  const { data, html, headings } = await ContentLoader.parseMarkdownDocument(scenariosRaw);

  container.innerHTML = `
    <div class="topic-layout">
      <article class="topic-content-wrapper">
        <div class="topic-header">
          <div class="breadcrumbs">
            <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">Real Ssenarilər</span>
          </div>
          <h1 class="page-title">${data.title || 'Real İstehsalat Ssenariləri'}</h1>
          <p class="page-desc">${data.subtitle || ''}</p>
        </div>

        <div class="markdown-body" id="scenarios-markdown-body">
          ${html}
        </div>
      </article>

      <aside class="topic-toc-sidebar">
        <div id="scenarios-toc-container"></div>
      </aside>
    </div>
  `;

  const markdownBody = container.querySelector('#scenarios-markdown-body') as HTMLElement;
  if (markdownBody) {
    enhanceCodeBlocks(markdownBody);
    initDialectTabs(markdownBody);
  }

  const tocContainer = container.querySelector('#scenarios-toc-container');
  if (tocContainer && headings.length > 0) {
    const tocEl = TableOfContents.create(headings);
    if (tocEl) {
      tocContainer.appendChild(tocEl);
    }
  }

  return container;
}
