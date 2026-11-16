(() => {
  'use strict';
  const button = document.querySelector('[data-motion-toggle]');
  const art = document.querySelector('[data-composition]');
  if (!button || !art) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false;
  try { userPaused = localStorage.getItem('fluid-site-motion') === 'paused'; } catch (_) {}
  let visible = true;
  let frame = 0;
  let last = 0;
  let elapsed = 0;
  const blob = art.querySelector('[data-blob]');
  const rings = [...art.querySelectorAll('[data-ring]')];
  // A closed Catmull-Rom curve: shared points remain joined as its viscosity changes.
  function shape(t) {
    const points = Array.from({length: 10}, (_, i) => {
      const a = i * Math.PI / 5;
      const r = 184 + 23 * Math.sin(a * 3 + t * .12) + 13 * Math.cos(a * 2 - t * .09);
      return [300 + Math.cos(a) * r, 286 + Math.sin(a) * r * .92];
    });
    const pt = i => points[(i + points.length) % points.length];
    let d = `M ${pt(0).join(' ')}`;
    for (let i = 0; i < points.length; i++) {
      const a = pt(i - 1), b = pt(i), c = pt(i + 1), e = pt(i + 2);
      d += ` C ${b[0]+(c[0]-a[0])/6} ${b[1]+(c[1]-a[1])/6}, ${c[0]-(e[0]-b[0])/6} ${c[1]-(e[1]-b[1])/6}, ${c[0]} ${c[1]}`;
    }
    return d + ' Z';
  }
  function draw(t) {
    blob.setAttribute('d', shape(t));
    rings.forEach((ring, i) => {
      const breathe = Math.sin(t * .17 + i * .8);
      ring.setAttribute('transform', `rotate(${i*31 + Math.sin(t*.07+i)*12} 300 286)`);
      ring.setAttribute('rx', String(220 + i * 19 + breathe * 10));
      ring.setAttribute('ry', String(208 + i * 13 + Math.cos(t*.13+i)*17));
      ring.setAttribute('opacity', String(.24 + (Math.sin(t * .11 + i * .9) + 1) * .18));
      ring.setAttribute('stroke-dasharray', `${.12 + (Math.sin(t*.09+i)+1)*.27} 1`);
      ring.setAttribute('stroke-dashoffset', String(-t*.007-i*.13));
    });
  }
  function animate(now) {
    frame = 0;
    if (!running()) return;
    if (last) elapsed += Math.min(now - last, 100);
    last = now;
    draw(elapsed / 1000);
    frame = requestAnimationFrame(animate);
  }
  function running() { return !userPaused && !reduced.matches && !document.hidden && visible; }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    button.textContent = reduced.matches ? 'Motion off · system preference' : userPaused ? 'Play gentle motion' : 'Pause motion';
    button.setAttribute('aria-pressed', String(!userPaused && !reduced.matches));
    button.disabled = reduced.matches;
    if (running()) frame = requestAnimationFrame(animate);
  }
  button.addEventListener('click', () => {
    userPaused = !userPaused;
    try { localStorage.setItem('fluid-site-motion', userPaused ? 'paused' : 'playing'); } catch (_) {}
    sync();
  });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {rootMargin: '80px'}).observe(art);
  }
  draw(0); sync();
})();
