/* ═══════════════════════════════════════════════════════════
   TSP — Branch & Bound | El Viaje Perfecto
   main.js — all interactions, animations, canvas logic
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   1. CURSOR
───────────────────────────────────────────── */
(function initCursor() {
  const dot  = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = -100, my = -100, rx = -100, ry = -100;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  // Dot follows mouse instantly
  document.addEventListener('mousemove', e => {
    dot.style.left  = e.clientX + 'px';
    dot.style.top   = e.clientY + 'px';
  });

  // Ring follows with lag
  (function loop() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(loop);
  })();

  // Hover effect on interactive elements
  document.addEventListener('mouseover', e => {
    const t = e.target.closest('button, a, .obj-card, .index-card, .badge');
    if (t) dot.classList.add('hover');
  });
  document.addEventListener('mouseout', e => {
    const t = e.target.closest('button, a, .obj-card, .index-card, .badge');
    if (t) dot.classList.remove('hover');
  });
})();

/* ─────────────────────────────────────────────
   2. PAGE NAVIGATION
───────────────────────────────────────────── */
const Pages = {
  current: 'portada',

  show(id) {
    // Hide current
    const old = document.getElementById(this.current);
    if (old) {
      old.classList.remove('active');
      setTimeout(() => old.classList.remove('visible'), 450);
    }

    // Show new
    const next = document.getElementById(id);
    if (!next) return;
    next.classList.add('visible');
    // Force reflow for transition
    next.getBoundingClientRect();
    next.classList.add('active');

    // Nav links
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === id);
    });

    this.current = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Page-specific init
    if (id === 'desarrollo') {
      setTimeout(() => { MapView.draw(); TreeView.init(); }, 250);
    }
    if (id === 'introduccion') {
      setTimeout(() => IntroTree.draw(), 350);
    }
  }
};

// Wire all nav + CTA buttons
document.querySelectorAll('[data-goto]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    Pages.show(el.dataset.goto);
  });
});

/* ─────────────────────────────────────────────
   3. STAR CANVAS (portada background)
───────────────────────────────────────────── */
(function initStars() {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars = [], rafId;

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
    stars = Array.from({ length: 140 }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.6 + 0.3,
      a:  Math.random(),
      da: (Math.random() * 0.008 + 0.002) * (Math.random() < 0.5 ? 1 : -1),
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.x = (s.x + s.vx + W) % W;
      s.y = (s.y + s.vy + H) % H;
      s.a += s.da;
      if (s.a >= 1 || s.a <= 0) s.da *= -1;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,234,216,${s.a.toFixed(2)})`;
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);
})();

/* ─────────────────────────────────────────────
   4. MAP GRID (portada decorative background)
───────────────────────────────────────────── */
(function initMapGrid() {
  const canvas = document.getElementById('map-grid-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, offset = 0;

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const step = 60;
    ctx.strokeStyle = 'rgba(184,115,51,1)';
    ctx.lineWidth = 0.5;

    // Horizontal
    for (let y = (offset % step); y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Vertical
    for (let x = (offset % step); x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Dots at intersections
    ctx.fillStyle = 'rgba(212,160,23,0.25)';
    for (let y = (offset % step); y < H; y += step)
      for (let x = (offset % step); x < W; x += step) {
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
      }

    offset += 0.18;
    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);
})();

/* ─────────────────────────────────────────────
   5. COMPASS (portada decoration)
───────────────────────────────────────────── */
(function initCompass() {
  const wrap = document.querySelector('.compass-deco');
  if (!wrap) return;
  let angle = 0;
  (function spin() {
    angle += 0.25;
    wrap.style.transform = `rotate(${angle}deg)`;
    requestAnimationFrame(spin);
  })();
})();

/* ─────────────────────────────────────────────
   6. HERO ENTRANCE ANIMATIONS
───────────────────────────────────────────── */
(function heroEntrance() {
  const elements = [
    { sel: '.hero-eyebrow',  delay: 300 },
    { sel: '.hero-title',    delay: 550 },
    { sel: '.hero-subtitle', delay: 780 },
    { sel: '.hero-badges',   delay: 980 },
    { sel: '.cta-group',     delay: 1150 },
    { sel: '.scroll-indicator', delay: 1400 },
  ];
  elements.forEach(({ sel, delay }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    setTimeout(() => {
      el.style.transition = 'opacity .7s ease, transform .7s ease';
      el.style.transform  = 'translateY(0)';
      el.style.opacity    = '1';
    }, delay);
    // init state
    el.style.opacity   = '0';
    el.style.transform = 'translateY(22px)';
  });
})();

/* ─────────────────────────────────────────────
   7. SCROLL-REVEAL (fade-in elements)
───────────────────────────────────────────── */
(function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
})();

/* ─────────────────────────────────────────────
   8. NAV SCROLL BEHAVIOR
───────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 40);
});

/* ─────────────────────────────────────────────
   9. STEP TABS (desarrollo)
───────────────────────────────────────────── */
window.showStep = function(idx) {
  document.querySelectorAll('.step-tab').forEach((b, i) => b.classList.toggle('active', i === idx));
  document.querySelectorAll('.step-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
};

/* ─────────────────────────────────────────────
   10. INTRO TREE (introducción preview)
───────────────────────────────────────────── */
const IntroTree = {
  canvas: null,
  ctx: null,
  nodes: [
    { x: .50, y: .10, label: 'Raíz',    sub: 'LB=1380', c: '#1a6b5a', p: -1 },
    { x: .28, y: .38, label: 'N1',      sub: 'incl(2→3)', c: '#1a6b5a', p: 0 },
    { x: .72, y: .38, label: 'N2',      sub: 'excl(2→3)', c: '#b87333', p: 0 },
    { x: .15, y: .68, label: 'N3',      sub: 'LB=1790', c: '#1a6b5a', p: 1 },
    { x: .41, y: .68, label: 'N4 ✕',   sub: 'PODADO',   c: '#8b3a1e', p: 1 },
    { x: .59, y: .68, label: 'N5',      sub: 'LB=1790', c: '#1a6b5a', p: 2 },
    { x: .85, y: .68, label: 'N6 ✕',   sub: 'PODADO',   c: '#8b3a1e', p: 2 },
    { x: .15, y: .92, label: '★ ÓPT',  sub: '2180 km',  c: '#d4a017', p: 3 },
  ],
  progress: 0,

  draw() {
    this.canvas = document.getElementById('intro-tree-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width  = this.canvas.offsetWidth || 620;
    this.canvas.height = 300;
    this.progress = 0;
    this.animate();
  },

  animate() {
    const total = this.nodes.length;
    const step = () => {
      if (this.progress >= total) return;
      this.progress++;
      this.render();
      setTimeout(step, 260);
    };
    step();
  },

  render() {
    const W = this.canvas.width, H = this.canvas.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fafaf7'; ctx.fillRect(0, 0, W, H);

    for (let i = 1; i < this.progress; i++) {
      const n = this.nodes[i], p = this.nodes[n.p];
      const nx = n.x * W, ny = n.y * H;
      const px = p.x * W, py = p.y * H;
      ctx.beginPath();
      ctx.strokeStyle = n.c === '#8b3a1e' ? 'rgba(139,58,30,.35)' : 'rgba(26,107,90,.45)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash(n.c === '#8b3a1e' ? [5, 4] : []);
      ctx.moveTo(px, py + 18); ctx.lineTo(nx, ny - 18);
      ctx.stroke(); ctx.setLineDash([]);
    }

    for (let i = 0; i < this.progress; i++) {
      const n = this.nodes[i];
      const nx = n.x * W, ny = n.y * H;
      ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(nx, ny, 44, 17, 0, 0, Math.PI * 2);
      ctx.fillStyle = n.c; ctx.fill();
      ctx.shadowBlur = 0;
      if (i === this.progress - 1) {
        ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2.5; ctx.stroke();
      }
      ctx.fillStyle = 'white'; ctx.textAlign = 'center';
      ctx.font = 'bold 9.5px Space Mono, monospace';
      ctx.fillText(n.label, nx, ny - 2);
      ctx.font = '8px Space Mono, monospace';
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillText(n.sub, nx, ny + 9);
    }
  }
};

window.animateIntroTree = () => IntroTree.draw();

/* ─────────────────────────────────────────────
   11. MAP VIEW (desarrollo)
───────────────────────────────────────────── */
const MapView = {
  canvas: null,
  ctx: null,
  W: 800, H: 420,
  cities: [
    { name: 'CDMX', x: 410, y: 285, abbr: '①' },
    { name: 'GDL',  x: 235, y: 195, abbr: '②' },
    { name: 'MTY',  x: 480, y: 110, abbr: '③' },
    { name: 'PUE',  x: 490, y: 315, abbr: '④' },
    { name: 'QRO',  x: 370, y: 200, abbr: '⑤' },
  ],
  dist: [
    [0, 540, 920, 130, 200],
    [540,  0, 460, 670, 340],
    [920, 460,   0,1050, 730],
    [130, 670,1050,   0, 330],
    [200, 340, 730, 330,   0],
  ],
  optRoute: [0, 3, 4, 1, 2, 0],
  animTimer: null,

  draw() {
    this.canvas = document.getElementById('city-map-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.canvas.style.width  = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.scale(dpr, dpr);
    this.drawBase();
  },

  drawBase() {
    const ctx = this.ctx, W = this.W, H = this.H;
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#cce4f5');
    grad.addColorStop(1, '#a8d0e6');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    // Terrain patches
    const patches = [
      { x: 80,  y: 60,  w: 140, h: 100, c: 'rgba(140,180,100,.22)' },
      { x: 280, y: 30,  w: 200, h: 140, c: 'rgba(120,170,90,.18)' },
      { x: 560, y: 70,  w: 160, h: 90,  c: 'rgba(140,180,100,.2)' },
      { x: 50,  y: 270, w: 120, h: 110, c: 'rgba(130,175,95,.2)' },
      { x: 620, y: 240, w: 130, h: 130, c: 'rgba(120,170,90,.18)' },
    ];
    patches.forEach(p => {
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.c; ctx.fill();
    });

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = .6;
    for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Scale bar
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, H - 25); ctx.lineTo(130, H - 25); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.font = '10px Space Mono, monospace';
    ctx.textAlign = 'center'; ctx.fillText('~400 km', 80, H - 12);

    // Cities
    this.drawCities();
  },

  drawCities() {
    const ctx = this.ctx;
    this.cities.forEach(c => {
      // Shadow
      ctx.beginPath(); ctx.arc(c.x + 2, c.y + 2, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
      // Dot
      ctx.beginPath(); ctx.arc(c.x, c.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#8b3a1e'; ctx.fill();
      ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5; ctx.stroke();
      // Pulse ring
      ctx.beginPath(); ctx.arc(c.x, c.y, 16, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(139,58,30,.3)'; ctx.lineWidth = 1.5; ctx.stroke();
      // Label
      ctx.fillStyle = '#1a1008';
      ctx.font = 'bold 12px Crimson Pro, serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, c.x, c.y + 27);
    });
  },

  drawRoute(route, color, width, alpha, dashed) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    if (dashed) ctx.setLineDash([10, 6]);
    for (let k = 0; k < route.length - 1; k++) {
      const a = this.cities[route[k]], b = this.cities[route[k + 1]];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      // Arrowhead at midpoint
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const mx = (a.x * 0.45 + b.x * 0.55), my = (a.y * 0.45 + b.y * 0.55);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - 11 * Math.cos(ang - Math.PI / 6.5), my - 11 * Math.sin(ang - Math.PI / 6.5));
      ctx.lineTo(mx - 11 * Math.cos(ang + Math.PI / 6.5), my - 11 * Math.sin(ang + Math.PI / 6.5));
      ctx.closePath();
      ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.85; ctx.fill();
      ctx.globalAlpha = alpha;
    }
    ctx.setLineDash([]);
    ctx.restore();
    this.drawCities();
  },

  showAll() {
    this.stopAnim();
    this.drawBase();
    const routes = [
      [0,1,2,3,4,0], [0,1,3,2,4,0], [0,2,1,4,3,0],
      [0,3,1,2,4,0], [0,4,3,2,1,0]
    ];
    const colors = ['#4a7fa5','#5a8a4a','#a55a4a','#7a4a9a','#4a9a9a'];
    routes.forEach((r, i) => this.drawRoute(r, colors[i], 2, .6, true));
    document.getElementById('map-status').textContent = '🕸 Mostrando 5 rutas posibles de las 12 totales. La óptima se muestra en verde.';
  },

  showOptimal() {
    this.stopAnim();
    this.drawBase();
    this.drawRoute(this.optRoute, '#1a6b5a', 4, .95, false);
    let total = 0;
    for (let k = 0; k < this.optRoute.length - 1; k++)
      total += this.dist[this.optRoute[k]][this.optRoute[k + 1]];
    document.getElementById('map-status').textContent =
      `⭐ Ruta óptima: CDMX → PUE → QRO → GDL → MTY → CDMX | Total: ${total} km`;
  },

  animateStep: 0,
  animate() {
    this.stopAnim();
    this.drawBase();
    this.animateStep = 0;
    const names = ['CDMX', 'PUE', 'QRO', 'GDL', 'MTY', 'CDMX'];
    const segments = [[0,3],[3,4],[4,1],[1,2],[2,0]];
    const legDist  = [130, 330, 340, 460, 920];

    const step = () => {
      if (this.animateStep >= segments.length) {
        document.getElementById('map-status').textContent =
          '✅ Recorrido completo: 2,180 km — ¡Ruta óptima confirmada!';
        return;
      }
      const [a, b] = segments[this.animateStep];
      // Draw all previous segments
      this.drawBase();
      for (let k = 0; k <= this.animateStep; k++) {
        const [sa, sb] = segments[k];
        this.drawRoute([sa, sb], '#1a6b5a', 4, .9, false);
      }
      // Highlight current city
      const cur = this.cities[b];
      this.ctx.beginPath();
      this.ctx.arc(cur.x, cur.y, 20, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#d4a017'; this.ctx.lineWidth = 3;
      this.ctx.stroke();

      const visited = names.slice(0, this.animateStep + 2).join(' → ');
      document.getElementById('map-status').textContent =
        `▶ ${visited} | +${legDist[this.animateStep]} km`;
      this.animateStep++;
      this.animTimer = setTimeout(step, 950);
    };
    step();
  },

  stopAnim() {
    if (this.animTimer) { clearTimeout(this.animTimer); this.animTimer = null; }
  },

  clear() {
    this.stopAnim();
    this.drawBase();
    document.getElementById('map-status').textContent = '';
  }
};

window.mapShowAll     = () => MapView.showAll();
window.mapShowOptimal = () => MapView.showOptimal();
window.mapAnimate     = () => MapView.animate();
window.mapClear       = () => MapView.clear();

/* ─────────────────────────────────────────────
   12. B&B TREE (desarrollo — animated)
───────────────────────────────────────────── */
const TreeView = {
  canvas: null,
  ctx: null,
  step: 0,
  timer: null,
  autoRunning: false,

  nodes: [
    { id:0,  px:.500, py:.050, label:'Raíz',           sub:'LB = 1380 km', c:'#1a6b5a', par:-1, edgeLbl:'',             pruned:false },
    { id:1,  px:.250, py:.200, label:'N1: incl(2→3)',  sub:'LB = 1790 km', c:'#1a6b5a', par:0,  edgeLbl:'incluir 2→3', pruned:false },
    { id:2,  px:.750, py:.200, label:'N2: excl(2→3)',  sub:'LB = 1790 km', c:'#b87333', par:0,  edgeLbl:'excluir 2→3', pruned:false },
    { id:3,  px:.130, py:.370, label:'N3: incl(4→1)',  sub:'LB = 1790 km', c:'#1a6b5a', par:1,  edgeLbl:'incluir 4→1', pruned:false },
    { id:4,  px:.370, py:.370, label:'N4: incl(1→4)',  sub:'✕ SUBTOUR',    c:'#8b3a1e', par:1,  edgeLbl:'incluir 1→4', pruned:true  },
    { id:5,  px:.620, py:.370, label:'N5: incl(5→1)',  sub:'LB = 1790 km', c:'#1a6b5a', par:2,  edgeLbl:'incluir 5→1', pruned:false },
    { id:6,  px:.870, py:.370, label:'N6: excl(5→1)',  sub:'✕ PODADO',     c:'#8b3a1e', par:2,  edgeLbl:'excluir 5→1', pruned:true  },
    { id:7,  px:.065, py:.550, label:'N7: incl(5→2)',  sub:'LB = 1790 km', c:'#1a6b5a', par:3,  edgeLbl:'incluir 5→2', pruned:false },
    { id:8,  px:.200, py:.550, label:'N8: incl(3→1)',  sub:'✕ SUBTOUR',    c:'#8b3a1e', par:3,  edgeLbl:'incluir 3→1', pruned:true  },
    { id:9,  px:.570, py:.550, label:'N9: incl(1→5)',  sub:'LB = 1860 km', c:'#b87333', par:5,  edgeLbl:'incluir 1→5', pruned:false },
    { id:10, px:.680, py:.550, label:'N10: excl(1→5)', sub:'✕ PODADO',     c:'#8b3a1e', par:5,  edgeLbl:'excluir 1→5', pruned:true  },
    { id:11, px:.065, py:.750, label:'N11: incl(3→5)', sub:'LB = 1790 km', c:'#1a6b5a', par:7,  edgeLbl:'incluir 3→5', pruned:false },
    { id:12, px:.065, py:.920, label:'★ ÓPTIMO',       sub:'2,180 km ✓',   c:'#d4a017', par:11, edgeLbl:'CDMX→PUE→QRO→GDL→MTY→CDMX', pruned:false },
  ],

  info: [
    '📍 Nodo Raíz creado. Reducimos la matriz de costos completa:\n  Filas: 130+340+460+130+200 = 1260\n  Columnas: 0+0+120+0+0 = 120\n  ▶ LB Raíz = 1,380 km',
    '🔀 Ramificamos el arco (2→3) GDL→MTY — mayor penalización = 410 km.\n  N1 incluye este arco. Calculamos la nueva reducción de matriz.',
    '🔀 N2 excluye el arco (2→3). LB = 1380 + 410 = 1790 km.\n  Ambas ramas son competitivas. Exploramos N1 (best-first).',
    '🔀 Desde N1, ramificamos (4→1) PUE→CDMX. N3 hereda LB = 1790 km.',
    '✂️ N4 intenta incluir (1→4) CDMX→PUE — formaría un subtour 1→4→1.\n  PODADO inmediatamente. Esta rama no puede contener una solución válida.',
    '🔀 Desde N2, incluir (5→1) QRO→CDMX da N5 con LB = 1790 km.',
    '✂️ N6 excluye (5→1). LB sube demasiado. PODADO — no puede mejorar.',
    '🔀 Desde N3, incluir (5→2) QRO→GDL da N7. Reducción adicional mínima.',
    '✂️ N8 incluiría (3→1) MTY→CDMX — formaría subtour. PODADO.',
    '🔀 N9 incluye (1→5) CDMX→QRO. LB sube a 1860. Aún competitivo, seguimos.',
    '✂️ N10 excluye (1→5). Su LB supera nuestro mejor bound conocido. PODADO.',
    '🔀 N11 incluye (3→5) MTY→QRO. La ruta se está completando.',
    '🏆 SOLUCIÓN ÓPTIMA ENCONTRADA!\n  Ruta: CDMX → PUE → QRO → GDL → MTY → CDMX\n  Costo: 130+330+340+460+920 = 2,180 km\n  Se exploró 13 de 64 nodos posibles (ahorro del 80%).',
  ],

  init() {
    this.canvas = document.getElementById('bb-tree-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.step = 0;
    this.autoRunning = false;
    this.resize();
    this.render([]);
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const W   = this.canvas.offsetWidth || 800;
    const H   = 540;
    this.canvas.width  = W * dpr;
    this.canvas.height = H * dpr;
    this.canvas.style.height = H + 'px';
    this.ctx.scale(dpr, dpr);
    this._W = W; this._H = H;
  },

  render(visible) {
    const ctx = this.ctx, W = this._W, H = this._H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fafaf8'; ctx.fillRect(0, 0, W, H);

    // Draw edges
    visible.forEach(i => {
      const n = this.nodes[i];
      if (n.par < 0) return;
      const p = this.nodes[n.par];
      const nx = n.px * W, ny = n.py * H;
      const px = p.px * W, py = p.py * H;

      ctx.beginPath();
      ctx.strokeStyle = n.pruned ? 'rgba(139,58,30,.3)' : 'rgba(26,107,90,.4)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash(n.pruned ? [5, 4] : []);

      // Curved path
      const cpx = (nx + px) / 2 + (n.pruned ? 12 : 0);
      const cpy = (ny + py) / 2;
      ctx.moveTo(px, py + 17);
      ctx.quadraticCurveTo(cpx, cpy, nx, ny - 17);
      ctx.stroke(); ctx.setLineDash([]);

      // Edge label
      ctx.fillStyle = '#888'; ctx.font = '8px Space Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n.edgeLbl, (nx + px) / 2 + 16, (ny + py) / 2 - 4);
    });

    // Draw nodes
    visible.forEach((i, visIdx) => {
      const n = this.nodes[i];
      const nx = n.px * W, ny = n.py * H;
      const isNew = visIdx === visible.length - 1;

      ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(nx, ny, 56, 18, 0, 0, Math.PI * 2);
      ctx.fillStyle = n.c; ctx.fill();
      ctx.shadowBlur = 0;

      // Glow on latest node
      if (isNew) {
        ctx.beginPath();
        ctx.ellipse(nx, ny, 62, 24, 0, 0, Math.PI * 2);
        ctx.strokeStyle = n.c === '#d4a017' ? '#f0c040' : 'rgba(212,160,23,.6)';
        ctx.lineWidth = 2.5; ctx.stroke();
      }

      ctx.fillStyle = 'white'; ctx.textAlign = 'center';
      ctx.font = 'bold 8.5px Space Mono, monospace';
      ctx.fillText(n.label, nx, ny - 2);
      ctx.font = '7.5px Space Mono, monospace';
      ctx.fillStyle = 'rgba(255,255,255,.82)';
      ctx.fillText(n.sub, nx, ny + 9);
    });
  },

  stepForward() {
    if (this.step >= this.nodes.length) return;
    this.step++;
    const visible = Array.from({ length: this.step }, (_, i) => i);
    this.render(visible);
    const info = this.info[this.step - 1] || '';
    document.getElementById('tree-info').textContent = info;
  },

  reset() {
    this.stopAuto();
    this.step = 0;
    this.render([]);
    document.getElementById('tree-info').textContent = 'Presiona "▶ Siguiente nodo" para construir el árbol paso a paso, o "⏩ Auto" para animación completa.';
  },

  startAuto() {
    if (this.autoRunning) { this.stopAuto(); return; }
    this.autoRunning = true;
    document.getElementById('auto-tree-btn').textContent = '⏸ Pausar';
    const tick = () => {
      if (!this.autoRunning || this.step >= this.nodes.length) {
        this.stopAuto(); return;
      }
      this.stepForward();
      this.timer = setTimeout(tick, 820);
    };
    tick();
  },

  stopAuto() {
    this.autoRunning = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const btn = document.getElementById('auto-tree-btn');
    if (btn) btn.textContent = '⏩ Auto';
  }
};

window.treeNext  = () => TreeView.stepForward();
window.treeReset = () => TreeView.reset();
window.treeAuto  = () => TreeView.startAuto();

/* ─────────────────────────────────────────────
   13. TYPING EFFECT on hero title
───────────────────────────────────────────── */
(function typingEffect() {
  // subtle character-by-character reveal for hero eyebrow
  const el = document.querySelector('.hero-eyebrow');
  if (!el) return;
  const text = el.textContent;
  el.textContent = '';
  let i = 0;
  setTimeout(() => {
    const t = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) clearInterval(t);
    }, 38);
  }, 350);
})();

/* ─────────────────────────────────────────────
   14. PARTICLE BURST on CTA click
───────────────────────────────────────────── */
(function particleBurst() {
  document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', e => {
      for (let i = 0; i < 14; i++) {
        const p = document.createElement('div');
        const angle = (i / 14) * Math.PI * 2;
        const dist = 55 + Math.random() * 40;
        p.style.cssText = `
          position:fixed;
          left:${e.clientX}px; top:${e.clientY}px;
          width:6px; height:6px;
          background:${['#d4a017','#f0c040','#b87333'][i % 3]};
          border-radius:50%;
          pointer-events:none;
          z-index:9999;
          transition: transform .55s cubic-bezier(.2,.8,.3,1), opacity .55s;
        `;
        document.body.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0)`;
          p.style.opacity = '0';
        });
        setTimeout(() => p.remove(), 600);
      }
    });
  });
})();

/* ─────────────────────────────────────────────
   15. INIT on DOMContentLoaded
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Show portada by default
  const portada = document.getElementById('portada');
  if (portada) {
    portada.classList.add('visible');
    setTimeout(() => portada.classList.add('active'), 30);
  }
});