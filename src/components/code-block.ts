import { ContentLoader } from '../content-loader';

export function enhanceCodeBlocks(container: HTMLElement): void {
  const pres = container.querySelectorAll('pre');

  pres.forEach((pre) => {
    // Prevent double enhancement
    if (pre.closest('.code-block-wrapper')) return;

    const code = pre.querySelector('code');
    if (!code) return;

    const rawCode = code.textContent || '';
    let language = 'sql';
    let dialect = '';

    // Check class names (e.g. language-sql, language-python)
    const classList = Array.from(code.classList);
    for (const cls of classList) {
      if (cls.startsWith('language-')) {
        language = cls.replace('language-', '');
        break;
      }
    }

    // Check if code contains dialect comment: -- Dialect: T-SQL or # Dialect: PySpark
    const dialectMatch = rawCode.match(/(?:--|#|\/\/)\s*Dialect:\s*([A-Za-z0-9\-\s\/]+)/i);
    if (dialectMatch) {
      dialect = dialectMatch[1].trim();
    } else {
      if (language === 'sql') dialect = 'SQL';
      else if (language === 'python') dialect = 'Python';
      else if (language === 'bash') dialect = 'Bash';
      else if (language === 'json') dialect = 'JSON';
      else dialect = language.toUpperCase();
    }

    // Highlight code using Prism
    const highlighted = ContentLoader.highlightCode(rawCode, language);
    code.innerHTML = highlighted;

    // Create container
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    // Header
    const header = document.createElement('div');
    header.className = 'code-block-header';

    const labelBadge = document.createElement('span');
    labelBadge.className = 'code-dialect-badge';
    labelBadge.textContent = dialect;

    const actions = document.createElement('div');
    actions.className = 'code-block-actions';

    // Wrap toggle button
    const wrapBtn = document.createElement('button');
    wrapBtn.className = 'code-action-btn wrap-btn';
    wrapBtn.type = 'button';
    wrapBtn.title = 'Sətir bükmə (Wrap toggle)';
    wrapBtn.setAttribute('aria-label', 'Sətir bükməni aç və ya bağla');
    wrapBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M3 12h15a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H9"></path>
        <polyline points="13 15 9 18 13 21"></polyline>
      </svg>
      <span>Wrap</span>
    `;

    wrapBtn.addEventListener('click', () => {
      pre.classList.toggle('is-wrapped');
      wrapBtn.classList.toggle('active');
    });

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-action-btn copy-btn';
    copyBtn.type = 'button';
    copyBtn.title = 'Kodu kopyala';
    copyBtn.setAttribute('aria-label', 'Kodu kopyala');
    copyBtn.innerHTML = `
      <svg class="copy-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span class="copy-text">Kopyala</span>
    `;

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(rawCode);
        copyBtn.classList.add('copied');
        const textSpan = copyBtn.querySelector('.copy-text');
        if (textSpan) textSpan.textContent = 'Kopyalandı!';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          if (textSpan) textSpan.textContent = 'Kopyala';
        }, 2000);
      } catch (err) {
        console.error('Kopyalama xətası:', err);
      }
    });

    actions.appendChild(wrapBtn);
    actions.appendChild(copyBtn);

    header.appendChild(labelBadge);
    header.appendChild(actions);

    // Replace in DOM
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
}
