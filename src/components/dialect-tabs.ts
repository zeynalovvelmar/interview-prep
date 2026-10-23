export function initDialectTabs(container: HTMLElement): void {
  const tabsContainers = container.querySelectorAll('.dialect-tabs-container');

  tabsContainers.forEach((tc) => {
    const buttons = tc.querySelectorAll('.dialect-tab-btn');
    const panes = tc.querySelectorAll('.dialect-tab-pane');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab-target');
        if (!target) return;

        buttons.forEach((b) => b.classList.remove('active'));
        panes.forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        const activePane = tc.querySelector(`.dialect-tab-pane[data-tab-panel="${target}"]`);
        if (activePane) {
          activePane.classList.add('active');
        }
      });
    });
  });
}
