/* ========================================================
   Grid Apex — main.js
   Interactive background, scroll reveals, counter animation,
   grid canvas, and mobile nav.
   ======================================================== */

// ─── 1. Particle Background ─────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let w, h, particles = [], mouse = { x: -1000, y: -1000 };

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const PARTICLE_COUNT = Math.min(100, Math.floor(w * h / 15000));
  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = (Math.random() - 0.5) * 0.35;
      this.r = Math.random() * 1.8 + 0.5;
      this.alpha = Math.random() * 0.5 + 0.1;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > w) this.vx *= -1;
      if (this.y < 0 || this.y > h) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,255,${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  function animate() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,212,255,${0.06 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
      // Mouse attraction
      const mdx = mouse.x - particles[i].x;
      const mdy = mouse.y - particles[i].y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < 200) {
        particles[i].vx += mdx * 0.00008;
        particles[i].vy += mdy * 0.00008;
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
})();

// ─── 2. Navbar Scroll Effect ────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// ─── 3. Mobile Burger Toggle ────────────────────────────
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});
// Close on link click
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('active'));
});

// ─── 4. Scroll Reveal ───────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─── 5. Counter Animation ───────────────────────────────
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = +el.dataset.target;
      const suffix = el.dataset.suffix || '';
      let current = 0;
      const step = Math.max(1, Math.floor(target / 60));
      const interval = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(interval);
        }
        el.textContent = current + suffix;
      }, 25);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(el => counterObserver.observe(el));

// ─── 6. About Section — Interactive Grid Canvas ─────────
(function initGridCanvas() {
  const canvas = document.getElementById('gridCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }
  window.addEventListener('resize', resize);
  resize();

  const cols = 18;
  const rows = 18;
  const nodes = [];

  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      nodes.push({
        baseX: (i / cols) * w,
        baseY: (j / rows) * h,
        x: 0,
        y: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.012,
        amp: 2 + Math.random() * 4,
      });
    }
  }

  let t = 0;
  function animate() {
    ctx.clearRect(0, 0, w, h);
    t++;

    // Update positions
    nodes.forEach(n => {
      n.x = n.baseX + Math.sin(t * n.speed + n.phase) * n.amp;
      n.y = n.baseY + Math.cos(t * n.speed * 0.7 + n.phase) * n.amp;
    });

    // Draw connections
    const perRow = rows + 1;
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const idx = i * perRow + j;
        const node = nodes[idx];
        // Right neighbor
        if (i < cols) {
          const right = nodes[(i + 1) * perRow + j];
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(right.x, right.y);
          ctx.strokeStyle = 'rgba(0,212,255,0.12)';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
        // Bottom neighbor
        if (j < rows) {
          const bottom = nodes[i * perRow + j + 1];
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(bottom.x, bottom.y);
          ctx.strokeStyle = 'rgba(0,212,255,0.12)';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    // Draw pulse waves
    const pulseCount = 3;
    for (let p = 0; p < pulseCount; p++) {
      const offset = (t * 1.5 + p * 120) % (w + 200) - 100;
      nodes.forEach(n => {
        const dist = Math.abs(n.x - offset);
        if (dist < 60) {
          const intensity = 1 - dist / 60;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 2.5 + intensity * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,212,255,${intensity * 0.7})`;
          ctx.fill();
          // Glow
          ctx.beginPath();
          ctx.arc(n.x, n.y, 6 + intensity * 8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,212,255,${intensity * 0.12})`;
          ctx.fill();
        }
      });
    }

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,212,255,0.25)';
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }
  animate();
})();

// ─── 7. Smooth Scroll for anchor links ──────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

