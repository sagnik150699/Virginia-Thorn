/* ═══════════════════════════════════════════════════════════════
   Virginia Thorn — Main JavaScript
   Navigation, Scroll Reveals, Lightbox, Preloader, Animations
   ═══════════════════════════════════════════════════════════════ */

// Handle bfcache restore (back/forward navigation)
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // Remove any leftover exit transition overlays
    document.querySelectorAll('.page-transition').forEach(el => el.remove());
    // Dismiss preloader if still visible
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.add('hidden');
    // Restore scrolling
    document.body.style.overflow = '';
  }
});

document.addEventListener('DOMContentLoaded', () => {

  // ══════════════════════════════════════════════════════════════
  //  PAGE TRANSITION CURTAIN
  // ══════════════════════════════════════════════════════════════
  const transition = document.querySelector('.page-transition');
  if (transition) {
    requestAnimationFrame(() => transition.classList.add('reveal'));
    setTimeout(() => transition.remove(), 900);
  }

  // ══════════════════════════════════════════════════════════════
  //  PRELOADER
  // ══════════════════════════════════════════════════════════════
  const preloader = document.getElementById('preloader');
  if (preloader) {
    const dismissPreloader = () => {
      if (!preloader.classList.contains('hidden')) {
        preloader.classList.add('hidden');
        document.querySelector('.hero')?.classList.add('loaded');
        setTimeout(() => preloader.remove(), 1000);
      }
    };
    window.addEventListener('load', () => setTimeout(dismissPreloader, 1000));
    setTimeout(dismissPreloader, 4000); // fallback
  }

  // ══════════════════════════════════════════════════════════════
  //  NAVBAR SCROLL EFFECT
  // ══════════════════════════════════════════════════════════════
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 80);
    }, { passive: true });
  }

  // ══════════════════════════════════════════════════════════════
  //  MOBILE NAVIGATION TOGGLE
  // ══════════════════════════════════════════════════════════════
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');
  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      navMobile.classList.toggle('open');
      document.body.style.overflow = navMobile.classList.contains('open') ? 'hidden' : '';
    });
    navMobile.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navMobile.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  ACTIVE NAV LINK HIGHLIGHTING
  // ══════════════════════════════════════════════════════════════
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });

  // ══════════════════════════════════════════════════════════════
  //  SCROLL REVEAL (Intersection Observer)
  // ══════════════════════════════════════════════════════════════
  const revealSelector = '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur';
  const revealElements = document.querySelectorAll(revealSelector);

  if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('visible'));
  }

  // Footer reveal
  const footer = document.querySelector('.footer');
  if (footer && 'IntersectionObserver' in window) {
    const footerObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          footerObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    footerObserver.observe(footer);
  } else if (footer) {
    footer.classList.add('visible');
  }

  // ══════════════════════════════════════════════════════════════
  //  SMOOTH SCROLL FOR ANCHOR LINKS
  // ══════════════════════════════════════════════════════════════
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = navbar ? navbar.offsetHeight : 0;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - navHeight - 20,
          behavior: 'smooth'
        });
      }
    });
  });

  // ══════════════════════════════════════════════════════════════
  //  CUSTOM CURSOR (Desktop Only)
  // ══════════════════════════════════════════════════════════════
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch && window.innerWidth > 768) {
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add('has-custom-cursor');

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
      dot.classList.add('visible');
      ring.classList.add('visible');
    });

    // Smooth ring follow
    function animateRing() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    // Hover state on interactive elements
    const interactiveSelectors = 'a, button, [onclick], .gallery-item, .news-card, .project-card, .reel-card, input, textarea';
    document.querySelectorAll(interactiveSelectors).forEach(el => {
      el.addEventListener('mouseenter', () => {
        dot.classList.add('hovering');
        ring.classList.add('hovering');
      });
      el.addEventListener('mouseleave', () => {
        dot.classList.remove('hovering');
        ring.classList.remove('hovering');
      });
    });

    // Click animation
    document.addEventListener('mousedown', () => {
      dot.classList.add('clicking');
      ring.classList.add('clicking');
    });
    document.addEventListener('mouseup', () => {
      dot.classList.remove('clicking');
      ring.classList.remove('clicking');
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      dot.classList.remove('visible');
      ring.classList.remove('visible');
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  PARALLAX SCROLL EFFECT
  // ══════════════════════════════════════════════════════════════
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  if (parallaxElements.length > 0) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          parallaxElements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.3;
            const rect = el.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            const viewCenter = window.innerHeight / 2;
            const offset = (center - viewCenter) * speed;
            el.style.transform = `translateY(${offset}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ══════════════════════════════════════════════════════════════
  //  3D CARD TILT EFFECT
  // ══════════════════════════════════════════════════════════════
  if (!isTouch && window.innerWidth > 768) {
    const tiltCards = document.querySelectorAll('.news-card, .project-card');
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        card.classList.add('tilt-active');
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.classList.remove('tilt-active');
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  FLOATING PARTICLES (Site-wide)
  // ══════════════════════════════════════════════════════════════
  {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'site-particles';
    document.body.appendChild(particleContainer);

    const count = window.innerWidth > 768 ? 50 : 24;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.setProperty('--size', Math.random() * 4 + 2 + 'px');
      particle.style.setProperty('--duration', Math.random() * 8 + 6 + 's');
      particle.style.setProperty('--delay', Math.random() * 8 + 's');
      particle.style.setProperty('--dx', (Math.random() - 0.5) * 200 + 'px');
      particle.style.setProperty('--dy', -(Math.random() * 400 + 150) + 'px');
      particle.style.left = Math.random() * 100 + '%';
      particle.style.bottom = Math.random() * 100 + '%';
      particleContainer.appendChild(particle);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  BUTTON RIPPLE POSITION TRACKING
  // ══════════════════════════════════════════════════════════════
  document.querySelectorAll('.hero-cta, .contact-spotlight-btn, .music-link-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      btn.style.setProperty('--ripple-x', x + '%');
      btn.style.setProperty('--ripple-y', y + '%');
    });
  });

  // ══════════════════════════════════════════════════════════════
  //  MAGNETIC BUTTON EFFECT
  // ══════════════════════════════════════════════════════════════
  if (!isTouch && window.innerWidth > 768) {
    document.querySelectorAll('.hero-cta, .contact-spotlight-btn, .nav-logo').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  SMOOTH PAGE TRANSITIONS ON INTERNAL LINKS
  // ══════════════════════════════════════════════════════════════
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = href;

        // Create exit transition
        const exitTransition = document.createElement('div');
        exitTransition.className = 'page-transition';
        for (let i = 0; i < 5; i++) {
          const curtain = document.createElement('div');
          curtain.className = 'curtain';
          curtain.style.transformOrigin = 'bottom';
          curtain.style.transform = 'scaleY(0)';
          curtain.style.animation = `curtainDown 0.5s ${i * 0.04}s cubic-bezier(0.76, 0, 0.24, 1) forwards`;
          exitTransition.appendChild(curtain);
        }
        document.body.appendChild(exitTransition);

        setTimeout(() => {
          window.location.href = target;
        }, 400);
      });
    }
  });

  // Add exit keyframe dynamically
  if (!document.querySelector('#curtain-exit-style')) {
    const style = document.createElement('style');
    style.id = 'curtain-exit-style';
    style.textContent = '@keyframes curtainDown { to { transform: scaleY(1); } }';
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════════════════════
  //  CUSTOM AUDIO PLAYER
  // ══════════════════════════════════════════════════════════════
  let currentAudio = null;
  let currentCard = null;

  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  document.querySelectorAll('.vo-audio-card[data-src]').forEach(card => {
    const btn = card.querySelector('.player-btn');
    const playIcon = card.querySelector('.player-icon-play');
    const pauseIcon = card.querySelector('.player-icon-pause');
    const progressBar = card.querySelector('.player-progress');
    const progressFill = card.querySelector('.player-progress-fill');
    const timeEl = card.querySelector('.player-time');
    const src = card.dataset.src;
    let audio = null;

    function initAudio() {
      if (!audio) {
        audio = new Audio(src);
        audio.preload = 'none';
        audio.addEventListener('timeupdate', () => {
          if (audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = pct + '%';
            timeEl.textContent = formatTime(audio.currentTime);
          }
        });
        audio.addEventListener('ended', () => {
          card.classList.remove('playing');
          playIcon.style.display = '';
          pauseIcon.style.display = 'none';
          progressFill.style.width = '0%';
          timeEl.textContent = '0:00';
          currentAudio = null;
          currentCard = null;
        });
        audio.addEventListener('loadedmetadata', () => {
          timeEl.textContent = formatTime(audio.duration);
        });
      }
      return audio;
    }

    btn.addEventListener('click', () => {
      const a = initAudio();

      // Stop any other playing audio
      if (currentAudio && currentAudio !== a) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentCard.classList.remove('playing');
        currentCard.querySelector('.player-icon-play').style.display = '';
        currentCard.querySelector('.player-icon-pause').style.display = 'none';
        currentCard.querySelector('.player-progress-fill').style.width = '0%';
        currentCard.querySelector('.player-time').textContent = '0:00';
      }

      if (a.paused) {
        a.play();
        card.classList.add('playing');
        playIcon.style.display = 'none';
        pauseIcon.style.display = '';
        currentAudio = a;
        currentCard = card;
      } else {
        a.pause();
        card.classList.remove('playing');
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';
      }
    });

    // Click to seek on progress bar
    progressBar.addEventListener('click', (e) => {
      const a = initAudio();
      if (a.duration) {
        const rect = progressBar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        a.currentTime = pct * a.duration;
      }
    });
  });

});

// ══════════════════════════════════════════════════════════════
//  LIGHTBOX
// ══════════════════════════════════════════════════════════════
function openLightbox(el) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const img = el.querySelector('img');
  if (lightbox && lightboxImg && img) {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});
