/**
 * main.js
 * -------
 * Site-wide chrome: ambient particle field, cursor glow, responsive nav,
 * theme toggle (persisted via /api/settings + localStorage), GSAP
 * scroll reveals, and the FAQ accordion. Page-specific logic lives in
 * gesture.js (capture page) and puzzle.js (play page).
 */

document.addEventListener('DOMContentLoaded', () => {
  initParticleField();
  initCursorGlow();
  initNav();
  initTheme();
  initReveals();
  initFaq();
  initDifficultyPicker();
  initHoverSound();
});

/* ---------------- Particle field ---------------- */
function initParticleField() {
  const canvas = document.getElementById('particleField');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COUNT = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 22000));
  const colors = ['124,92,255', '51,225,237', '255,107,107'];
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      c: colors[i % colors.length],
      a: Math.random() * 0.5 + 0.15,
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tick() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach((p) => {
      if (!reduceMotion) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  tick();
}

/* ---------------- Cursor glow ---------------- */
function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;
  window.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  });
}

/* ---------------- Nav ---------------- */
function initNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
}

/* ---------------- Theme ---------------- */
function initTheme() {
  const btn = document.getElementById('themeToggle');
  const root = document.documentElement;
  const stored = localStorage.getItem('ps_theme');
  if (stored) {
    root.setAttribute('data-theme', stored);
  }
  updateThemeIcon();

  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('ps_theme', next);
    updateThemeIcon();
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  });

  function updateThemeIcon() {
    const icon = btn.querySelector('i');
    if (!icon) return;
    const isLight = root.getAttribute('data-theme') === 'light';
    icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

/* ---------------- Scroll reveals ---------------- */
function initReveals() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length || !window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  targets.forEach((el, i) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
      delay: (i % 4) * 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
}

/* ---------------- FAQ accordion ---------------- */
function initFaq() {
  document.querySelectorAll('.faq-item').forEach((item) => {
    item.querySelector('.faq-q').addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((o) => o.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

/* ---------------- Difficulty picker (landing + capture) ---------------- */
function initDifficultyPicker() {
  const cards = document.querySelectorAll('[data-difficulty]');
  if (!cards.length) return;
  const stored = sessionStorage.getItem('ps_difficulty') || 'easy';
  cards.forEach((c) => c.classList.toggle('selected', c.dataset.difficulty === stored));
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      sessionStorage.setItem('ps_difficulty', card.dataset.difficulty);
      window.PSAudio && PSAudio.beep();
    });
  });
}

/* ---------------- Hover sound on buttons ---------------- */
function initHoverSound() {
  document.body.addEventListener(
    'click',
    () => window.PSAudio && PSAudio.unlock(),
    { once: true }
  );
  document.querySelectorAll('.ps-btn, .ps-icon-btn').forEach((b) => {
    b.addEventListener('mouseenter', () => window.PSAudio && PSAudio.hover());
  });
}