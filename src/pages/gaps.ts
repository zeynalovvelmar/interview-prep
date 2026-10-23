import gapsRaw from '../../content/gaps.md?raw';
import { ContentLoader } from '../content-loader';
import { TableOfContents } from '../components/toc';
import { enhanceCodeBlocks } from '../components/code-block';
import { initDialectTabs } from '../components/dialect-tabs';

export async function renderGapsPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container gaps-page';

  const { data, html, headings } = await ContentLoader.parseMarkdownDocument(gapsRaw);

  container.innerHTML = `
    <div class="topic-layout">
      <article class="topic-content-wrapper">
        <div class="topic-header">
          <div class="breadcrumbs">
            <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">Boşluqlar & Strategiya</span>
          </div>
          <h1 class="page-title">${data.title || 'Boşluqlarla Necə İşləməli'}</h1>
          <p class="page-desc">${data.subtitle || ''}</p>
        </div>

        <div class="markdown-body" id="gaps-markdown-body">
          ${html}
        </div>
      </article>

      <aside class="topic-toc-sidebar">
        <div id="gaps-toc-container"></div>
      </aside>
    </div>
  `;

  const markdownBody = container.querySelector('#gaps-markdown-body') as HTMLElement;
  if (markdownBody) {
    enhanceCodeBlocks(markdownBody);
    initDialectTabs(markdownBody);
  }

  const tocContainer = container.querySelector('#gaps-toc-container');
  if (tocContainer && headings.length > 0) {
    const tocEl = TableOfContents.create(headings);
    if (tocEl) {
      tocContainer.appendChild(tocEl);
    }
  }

  return container;
}
