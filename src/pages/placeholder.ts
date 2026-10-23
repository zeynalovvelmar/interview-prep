export function renderPlaceholderPage(title: string, milestone: string, desc: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'page-container placeholder-page';

  container.innerHTML = `
    <div class="page-header">
      <div class="breadcrumbs">
        <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">${title}</span>
      </div>
      <h1 class="page-title">${title}</h1>
      <p class="page-desc">${desc}</p>
    </div>

    <div class="milestone-placeholder-card">
      <div class="placeholder-icon">🚧</div>
      <h2 class="placeholder-title">Növbəti Mərhələdə Hazırlanır (${milestone})</h2>
      <p class="placeholder-text">
        Bu bölmə SPEC.md planına uyğun olaraq <strong>${milestone}</strong> mərhələsində tam əlavə ediləcək. Hal-hazırda <strong>M1</strong> sınaq boru kəməri (pipeline proof) çərçivəsində mövzular və sual-cavab bankı aktivdir.
      </p>
      <div class="placeholder-actions">
        <a href="#/topics" class="btn btn-primary">Mövzuları Oxu</a>
        <a href="#/qa" class="btn btn-secondary">Sual-Cavab Bankına Bax</a>
      </div>
    </div>
  `;

  return container;
}
