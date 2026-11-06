// Bubble Vortex page: entrances, the sky crossfade, the playable ring round the core, the chest loop, the launch note.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Entrances: each section's parts rise in order as it arrives (heading, text, picture), once.
  const rise = [...document.querySelectorAll('[data-rise]')];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const box = e.target.closest('section, footer, li, .field, .plan') || document.body;
      const sibs = [...box.querySelectorAll('[data-rise]')];
      const i = Math.max(0, sibs.indexOf(e.target));
      e.target.style.setProperty('--d', Math.min(i, 8) * 75 + 'ms');
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  rise.forEach((el) => io.observe(el));

  // 2. Signature: the board's sky shifts between the game's worlds (teal, ember, ice, jade).
  const skies = [...document.querySelectorAll('.board .sky')];
  let sky = 0, skyTimer = null;
  const nextSky = () => { skies[sky].classList.remove('is-on'); sky = (sky + 1) % skies.length; skies[sky].classList.add('is-on'); };
  const startSky = () => { if (!reduce && !skyTimer) skyTimer = setInterval(nextSky, 6000); };
  const stopSky = () => { clearInterval(skyTimer); skyTimer = null; };
  document.addEventListener('visibilitychange', () => (document.hidden ? stopSky() : startSky()));
  startSky();

  // 3. The live thing: a ring of the game's bubbles round the core. Aim, fire from the centre, three of a colour pop.
  const board = document.getElementById('board');
  const status = document.getElementById('board-status');
  const again = document.getElementById('again');
  const START = ['red', 'red', 'blue', 'yellow', 'yellow', 'green', 'blue', 'blue', 'red', 'green', 'green', 'yellow',
    'cyan', 'cyan', 'red', 'blue', 'yellow', 'yellow', 'green', 'cyan'];
  const LIMIT = 30;
  let ring = [], shot = null, aim = -Math.PI / 2, busy = false, seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const sprite = (c) => 'img/bv/bubble-' + c + '.png';
  const say = (t) => { status.textContent = t; };

  const geo = () => {
    const s = board.clientWidth, r = s * 0.37;
    const b = Math.min(s * 0.11, (2 * Math.PI * r / Math.max(ring.length, 1)) * 0.96);
    return { s, c: s / 2, r, b };
  };
  const slotAngle = (i, n) => -Math.PI / 2 + (i / n) * Math.PI * 2;

  function place(el, x, y, size, scale = 1) {
    el.style.width = el.style.height = size + 'px';
    el.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px) scale(${scale})`;
  }
  function layout() {
    const { c, r, b } = geo();
    ring.forEach((o, i) => { const a = slotAngle(i, ring.length); place(o.el, c + Math.cos(a) * r, c + Math.sin(a) * r, b); });
    if (shot) place(shot.el, c, c, b * 0.9);
    drawAim();
    requestAnimationFrame(() => board.querySelectorAll('.bub').forEach((el) => { if (el.style.transition === 'none') el.style.transition = ''; }));
  }
  const dots = [];
  function drawAim() {
    const { c, r, b } = geo();
    if (!dots.length) for (let k = 0; k < 7; k++) { const d = document.createElement('span'); d.className = 'dot'; board.appendChild(d); dots.push(d); }
    const from = b * 0.9, to = r - b * 0.7;
    dots.forEach((d, k) => {
      const t = from + (to - from) * ((k + 1) / dots.length);
      d.style.transform = `translate(${c + Math.cos(aim) * t}px, ${c + Math.sin(aim) * t}px)`;
    });
  }
  function bubble(colour) {
    const el = document.createElement('img');
    el.className = 'bub'; el.src = sprite(colour); el.alt = ''; el.width = 128; el.height = 128;
    el.style.transition = 'none';   // the first placement does not travel; layout() turns travel on after it
    board.appendChild(el);
    return { colour, el };
  }
  function loadShot() {
    const present = [...new Set(ring.map((o) => o.colour))];
    const colour = present.length ? present[Math.floor(rnd() * present.length)] : 'yellow';
    shot = bubble(colour);
    layout();
  }
  function reset() {
    board.querySelectorAll('.bub').forEach((n) => n.remove());
    seed = 7; ring = START.map(bubble); shot = null; busy = false; again.hidden = true;
    board.classList.add('live');
    loadShot();
    say(ring.length + ' bubbles left. Tap to fire.');
  }
  function runAt(i) {
    const n = ring.length, col = ring[i].colour; let a = i, z = i, len = 1;
    while (len < n && ring[(a - 1 + n) % n].colour === col) { a = (a - 1 + n) % n; len++; }
    while (len < n && ring[(z + 1) % n].colour === col) { z = (z + 1) % n; len++; }
    const idx = []; for (let k = 0; k < len; k++) idx.push((a + k) % n);
    return idx;
  }
  function pop(idx) {
    return new Promise((done) => {
      const gone = idx.map((k) => ring[k]);
      gone.forEach((o) => { o.el.style.opacity = '0'; o.el.style.transform += ' scale(1.5)'; });
      ring = ring.filter((o) => !gone.includes(o));
      setTimeout(() => { gone.forEach((o) => o.el.remove()); done(gone.length); }, reduce ? 0 : 220);
    });
  }
  async function fire() {
    if (busy || !shot || !ring.length) return;
    busy = true;
    const { c, r } = geo();
    const n = ring.length;
    let k = Math.round((((aim + Math.PI / 2) / (Math.PI * 2)) % 1 + 1) % 1 * n) % n;   // the gap nearest the aim
    const tx = c + Math.cos(aim) * r, ty = c + Math.sin(aim) * r, b = geo().b;
    if (!reduce) {
      shot.el.style.transition = 'transform .24s linear';
      place(shot.el, tx, ty, b);
      await new Promise((d) => setTimeout(d, 240));
      shot.el.style.transition = '';
    }
    ring.splice(k, 0, shot); shot = null; layout();
    await new Promise((d) => setTimeout(d, reduce ? 0 : 200));
    let popped = 0, at = k;
    for (;;) {
      if (!ring.length) break;
      at = Math.min(at, ring.length - 1);
      const run = runAt(at);
      if (run.length < 3) break;
      const first = Math.min(...run);
      popped += await pop(run); layout();
      at = Math.max(0, Math.min(first, ring.length - 1));
      if (!ring.length) break;
      await new Promise((d) => setTimeout(d, reduce ? 0 : 160));
      if (ring.length < 2 || ring[(at - 1 + ring.length) % ring.length].colour !== ring[at].colour) break;
    }
    if (!ring.length) { say('Siege broken. The ring is clear.'); again.hidden = false; busy = false; return; }
    if (ring.length >= LIMIT) { say('The siege reached the core.'); again.hidden = false; busy = false; return; }
    say((popped ? 'Popped ' + popped + '. ' : '') + ring.length + ' bubbles left.');
    loadShot(); busy = false;
  }
  function aimAt(ev) {
    const box = board.getBoundingClientRect();
    aim = Math.atan2(ev.clientY - box.top - box.height / 2, ev.clientX - box.left - box.width / 2);
    drawAim();
  }
  if (board) {
    reset();
    board.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') aimAt(e); });
    board.addEventListener('click', (e) => { aimAt(e); fire(); });
    board.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { aim -= Math.PI / 36; drawAim(); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { aim += Math.PI / 36; drawAim(); e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') { fire(); e.preventDefault(); }
    });
    again.addEventListener('click', () => { reset(); board.focus(); });
    addEventListener('resize', layout);
  }

  // 4. The chest loop plays only while it is on screen.
  const vid = document.querySelector('.road video');
  if (vid) {
    const vio = new IntersectionObserver(([e]) => { if (e.isIntersecting && !reduce) vid.play().catch(() => {}); else vid.pause(); });
    vio.observe(vid);
  }

  // 5. The launch note: a mailto with the visitor's address written into the body.
  const form = document.getElementById('launch-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const body = 'Please write to ' + email + ' on the day Bubble Vortex comes out.';
    location.href = 'mailto:support@voltfoxgames.com?subject=' + encodeURIComponent('Bubble Vortex launch') + '&body=' + encodeURIComponent(body);
  });
})();
