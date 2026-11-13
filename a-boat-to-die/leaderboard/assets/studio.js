/* Progressive enhancement. Original image and document links work without JS. */
(() => {
  const filters = document.querySelector('.filters');
  const shots = [...document.querySelectorAll('.shot')];
  const galleryStatus = document.querySelector('.gallery-status');
  if (filters && shots.length) {
    filters.hidden = false;
    filters.addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (!button) return;
      const kind = button.dataset.filter;
      filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      shots.forEach(shot => { shot.hidden = kind !== 'all' && shot.dataset.kind !== kind; });
      const visible = shots.filter(shot => !shot.hidden).length;
      if (galleryStatus) galleryStatus.textContent = `${visible} ${kind === 'all' ? 'views' : kind + ' views'} / Select an image to inspect at full size.`;
    });
  }
  // Delegation also covers reference cards rebuilt by the existing search tools.
  function entries() {
    return [...document.querySelectorAll('main a[href]')].filter(link => {
      const image = link.querySelector('img');
      return image && image.getClientRects().length && /\.(png|jpe?g|webp|gif|avif)(?:[?#]|$)/i.test(link.getAttribute('href'));
    });
  }
  let dialog = document.querySelector('#viewer');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'viewer';
    dialog.className = 'viewer';
    dialog.dataset.mlUi = '';
    dialog.setAttribute('aria-labelledby', 'viewer-title');
    dialog.setAttribute('aria-describedby', 'viewer-caption');
    dialog.innerHTML = '<div class="viewer-bar"><p id="viewer-title" class="mono">VISUAL REVIEW <span id="viewer-count"></span></p><button class="viewer-close" type="button" autofocus>Close ×</button></div><img id="viewer-image" alt=""><div class="viewer-bottom"><p id="viewer-caption" aria-live="polite"></p><div class="viewer-actions"><a id="viewer-original" target="_blank" rel="noopener">Open original ↗</a><button class="viewer-step" id="viewer-prev" type="button" aria-label="Previous image">←</button><button class="viewer-step" id="viewer-next" type="button" aria-label="Next image">→</button></div></div>';
    document.body.append(dialog);
  }
  let active = [];
  let current = 0;
  let opener = null;
  let previousOverflow = '';
  const previous = dialog.querySelector('#viewer-prev');
  const next = dialog.querySelector('#viewer-next');
  function show(index) {
    current = index;
    const link = active[index];
    const image = link.querySelector('img');
    const container = link.closest('figure,article,section');
    const title = image.alt || container?.querySelector('h2,h3,figcaption')?.textContent.trim() || 'Review image';
    dialog.querySelector('#viewer-image').src = link.href;
    dialog.querySelector('#viewer-image').alt = title;
    dialog.querySelector('#viewer-caption').textContent = title;
    dialog.querySelector('#viewer-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(active.length).padStart(2, '0')}`;
    dialog.querySelector('#viewer-original').href = link.href;
    previous.disabled = index === 0;
    next.disabled = index === active.length - 1;
  }
  if (typeof dialog.showModal === 'function') {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const candidates = entries();
      const index = candidates.indexOf(link);
      if (index < 0) return;
      event.preventDefault();
      active = candidates;
      opener = link;
      show(index);
      previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    });
    dialog.querySelector('.viewer-close').addEventListener('click', () => dialog.close());
    previous.addEventListener('click', () => { if (current > 0) show(current - 1); });
    next.addEventListener('click', () => { if (current < active.length - 1) show(current + 1); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' && current > 0) { event.preventDefault(); show(current - 1); }
      if (event.key === 'ArrowRight' && current < active.length - 1) { event.preventDefault(); show(current + 1); }
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected && opener.getClientRects().length) opener.focus();
    });
  }
  if (navigator.clipboard && window.isSecureContext) {
    document.querySelectorAll('.copy').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', async () => {
        const path = button.previousElementSibling.textContent;
        const status = document.querySelector('.copy-status');
        try {
          await navigator.clipboard.writeText(path);
          if (status) status.textContent = `Copied: ${path}`;
        } catch {
          if (status) status.textContent = 'Copy unavailable here. Select the map path and copy it manually.';
        }
      });
    });
  }
})();
