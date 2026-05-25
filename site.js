/* ============== SHARED SITE JS ============== */
(function() {
  // ===== CURSOR TOGGLE (persists in localStorage) =====
  const cursorKey = 'avm-no-custom-cursor';
  const cursorBtn = document.querySelector('.cursor-toggle');
  function applyCursorState() {
    const off = localStorage.getItem(cursorKey) === '1';
    document.body.classList.toggle('no-custom-cursor', off);
    if (cursorBtn) cursorBtn.textContent = off ? '✦ Cursor: off' : '✦ Cursor: on';
  }
  applyCursorState();
  if (cursorBtn) {
    cursorBtn.addEventListener('click', () => {
      const isOff = localStorage.getItem(cursorKey) === '1';
      localStorage.setItem(cursorKey, isOff ? '0' : '1');
      applyCursorState();
    });
  }

  // ===== HAMBURGER (mobile nav) =====
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }));
  }

  // ===== JUMP-NAV SCROLL-SPY (highlights current chapter chip) =====
  const jumpNav = document.querySelector('.jump-nav');
  if (jumpNav) {
    const chipLinks = [...jumpNav.querySelectorAll('a[href^="#"]')];
    const targets = chipLinks
      .map(a => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) }))
      .filter(o => o.el);
    if (targets.length) {
      const spyObs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          const match = targets.find(t => t.el === e.target);
          if (!match) return;
          if (e.isIntersecting) {
            chipLinks.forEach(l => l.classList.remove('active'));
            match.a.classList.add('active');
            // keep the active chip visible in the horizontally-scrolling nav
            const navRect = jumpNav.getBoundingClientRect();
            const chipRect = match.a.getBoundingClientRect();
            if (chipRect.right > navRect.right || chipRect.left < navRect.left) {
              match.a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
            }
          }
        });
      }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
      targets.forEach(t => spyObs.observe(t.el));
    }
  }

  // ===== LAZY AUTOPLAY-ON-HOVER for project cards marked data-autoplay-on-hover =====
  document.querySelectorAll('video[data-autoplay-on-hover]').forEach(v => {
    const card = v.closest('.project-card') || v.parentElement;
    if (!card) return;
    card.addEventListener('mouseenter', () => { v.play().catch(() => {}); });
    card.addEventListener('mouseleave', () => { v.pause(); });
  });

  // ===== CURSOR =====
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (dot && ring) {
    let mx = window.innerWidth/2, my = window.innerHeight/2, rx = mx, ry = my;
    let rot = 0;
    let hovering = false;
    function applyDot() {
      const scale = hovering ? 1.4 : 1;
      dot.style.transform = `translate(${mx - 11}px, ${my - 11}px) rotate(${rot}deg) scale(${scale})`;
    }
    document.addEventListener('mousemove', e => {
      const dx = e.clientX - mx, dy = e.clientY - my;
      mx = e.clientX; my = e.clientY;
      rot += (dx + dy) * 1.2; // pickleball rolls as you move
      applyDot();
    });
    function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx - 19}px, ${ry - 19}px)`;
      requestAnimationFrame(loop);
    }
    loop();
    document.querySelectorAll('a, button, .media-card, .video-card, .iphone, .knob, .skill-pill, .pillar, .sub-card, input, .role-tile, .store-list li, .brand-card, .deck-card, .meta-row, .celeb-card, .post-stat-card').forEach(el => {
      el.addEventListener('mouseenter', () => { ring.classList.add('hover'); hovering = true; applyDot(); });
      el.addEventListener('mouseleave', () => { ring.classList.remove('hover'); hovering = false; applyDot(); });
    });
  }

  // ===== VIDEO HANDLER (autoplay-on-view + click-to-play/pause + poster fallback) =====
  // Apply to every <video> in a .video-card unless it has data-autoplay-always
  const videoCards = document.querySelectorAll('.video-card');
  const playObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const v = e.target.querySelector('video');
      if (!v) return;
      if (e.isIntersecting && e.intersectionRatio >= 0.5) {
        const p = v.play();
        if (p && p.then) {
          p.then(() => e.target.classList.add('playing')).catch(() => {});
        }
      } else {
        v.pause();
        e.target.classList.remove('playing');
      }
    });
  }, { threshold: [0, 0.5, 1] });

  videoCards.forEach(card => {
    const v = card.querySelector('video');
    if (!v) return;
    // Ensure these are set for browser autoplay policy
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    // Attempt to load poster from data attribute or sibling convention
    if (!v.poster && v.dataset.poster) v.poster = v.dataset.poster;

    // Click-to-toggle
    card.addEventListener('click', (e) => {
      // ignore clicks on labels/anchors inside the card
      if (e.target.closest('a')) return;
      if (v.paused) {
        v.play().then(() => card.classList.add('playing')).catch(() => {});
      } else {
        v.pause();
        card.classList.remove('playing');
      }
    });

    // Autoplay on hover for desktop snap-feel
    card.addEventListener('mouseenter', () => {
      if (v.paused) v.play().then(() => card.classList.add('playing')).catch(() => {});
    });
    card.addEventListener('mouseleave', () => {
      // keep playing if it's already running for momentum
    });

    // Inject play button overlay if not already present
    if (!card.querySelector('.play-button')) {
      const btn = document.createElement('div');
      btn.className = 'play-button';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20"/></svg>';
      card.appendChild(btn);
    }

    playObs.observe(card);
  });

  // ===== REVEAL ON SCROLL =====
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('section, .media-card, .iphone, .polaroid, .education-card, .browser-frame, .social-page-card, .sub-card, .pillar, .role-tile, .brand-card, .region-block, .deck-card, .process-step').forEach(el => {
    el.classList.add('reveal');
    revealObs.observe(el);
  });
})();
