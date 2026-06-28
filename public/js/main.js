/* ============================================================
   main.js — Valkyria
   Cursor · Nav · Contador · Reveal · Countdown · Progress · Cookie
   ============================================================ */


// ─── PRELOADER ──────────────────────────────────────────────
window.addEventListener('load', () => {
  const pre = document.getElementById('preloader');
  if (!pre) return;
  pre.classList.add('done');
  setTimeout(() => pre.remove(), 700);
});

document.addEventListener('DOMContentLoaded', () => {

  // ─── CURSOR PERSONALIZADO ─────────────────────────────────
  const cur  = document.getElementById('cur');
  const ring = document.getElementById('ring');

  const hasPointer = window.matchMedia('(pointer: fine)').matches;

  if (hasPointer && cur && ring) {
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      cur.style.left = mx + 'px';
      cur.style.top  = my + 'px';
    });

    const animRing = () => {
      rx += (mx - rx) * 0.1;
      ry += (my - ry) * 0.1;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animRing);
    };
    animRing();

    const interactiveEls = document.querySelectorAll(
      'a, button, .pillar, .merch-item, .offer-card, .brow, .step, .producto-card, .filo-card, .faq-item, .logro-card'
    );

    interactiveEls.forEach(el => {
      el.addEventListener('mouseenter', () => {
        cur.style.width  = '18px';
        cur.style.height = '18px';
        ring.style.width  = '44px';
        ring.style.height = '44px';
        ring.style.opacity = '0.7';
      });
      el.addEventListener('mouseleave', () => {
        cur.style.width  = '10px';
        cur.style.height = '10px';
        ring.style.width  = '32px';
        ring.style.height = '32px';
        ring.style.opacity = '0.4';
      });
    });
  } else {
    if (cur)  cur.style.display = 'none';
    if (ring) ring.style.display = 'none';
    document.body.style.cursor = 'auto';
  }


  // ─── NAV SCROLL ──────────────────────────────────────────
  const nav = document.getElementById('nav');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });


  // ─── MENÚ HAMBURGUESA (MOBILE) ────────────────────────────
  const hamburger   = document.getElementById('hamburger');
  const mobileMenu  = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu?.querySelectorAll('a');

  const toggleMenu = (force) => {
    const isOpen = hamburger.classList.toggle('open', force);
    mobileMenu.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  hamburger?.addEventListener('click', () => toggleMenu());
  mobileLinks?.forEach(link => link.addEventListener('click', () => toggleMenu(false)));


  // ─── CONTADOR HERO ────────────────────────────────────────
  function animateCounter(id, target, duration) {
    const el = document.getElementById(id);
    if (!el) return;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(2, -10 * progress);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  }

  setTimeout(() => {
    animateCounter('s1', 100, 1200);
    animateCounter('s2',   5,  800);
    animateCounter('s3',  12, 1000);
  }, 1000);


  // ─── REVEAL ON SCROLL ─────────────────────────────────────
  const revealEls = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 70);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealEls.forEach(el => observer.observe(el));


  // ─── ACTIVE NAV LINK (scroll spy) ────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => spyObserver.observe(s));


  // ─── CUPOS + COUNTDOWN dinámicos ─────────────────────────
  let countdownId = null;
  function startCountdown(dateStr) {
    if (countdownId) clearInterval(countdownId);
    const cdEl = document.getElementById('countdown');
    if (!cdEl) return;
    const TARGET = new Date(dateStr + 'T00:00:00');
    const tick = () => {
      const diff = TARGET - Date.now();
      if (diff <= 0) { cdEl.innerHTML = '<span class="cd-live">¡Es hoy!</span>'; clearInterval(countdownId); return; }
      const d = document.getElementById('cd-d'), h = document.getElementById('cd-h'),
            m = document.getElementById('cd-m'), s = document.getElementById('cd-s');
      if (d) d.textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
      if (h) h.textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
      if (m) m.textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      if (s) s.textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    };
    tick();
    countdownId = setInterval(tick, 1000);
  }
  const _cdEl = document.getElementById('countdown');
  if (_cdEl) startCountdown(_cdEl.dataset.date);

  fetch('/api/site/config')
    .then(r => r.ok ? r.json() : null)
    .then(cfg => {
      if (!cfg) return;
      if (cfg.cupos !== undefined) document.querySelectorAll('[data-cupos]').forEach(el => { el.textContent = cfg.cupos; });
      if (cfg.coaching_price !== undefined) document.querySelectorAll('[data-coaching-price]').forEach(el => { el.textContent = cfg.coaching_price; });
      const cdEl = document.getElementById('countdown');
      if (cfg.countdown_date && cdEl && cfg.countdown_date !== cdEl.dataset.date) {
        cdEl.dataset.date = cfg.countdown_date;
        startCountdown(cfg.countdown_date);
      }
    })
    .catch(() => {});


  // ─── BARRA DE PROGRESO ────────────────────────────────────
  const progressBar = document.getElementById('scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = Math.min((window.scrollY / total) * 100, 100) + '%';
    }, { passive: true });
  }


  // ─── VOLVER ARRIBA ────────────────────────────────────────
  const btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }



  // ─── COOKIE CONSENT ───────────────────────────────────────
  const cookieBanner = document.getElementById('cookie-banner');
  if (cookieBanner && !localStorage.getItem('vlk-cookie-ok')) {
    setTimeout(() => cookieBanner.classList.add('visible'), 2000);
    document.getElementById('cookie-accept')?.addEventListener('click', () => {
      localStorage.setItem('vlk-cookie-ok', '1');
      cookieBanner.classList.remove('visible');
    });
    document.getElementById('cookie-reject')?.addEventListener('click', () => {
      cookieBanner.classList.remove('visible');
    });
  }

});
