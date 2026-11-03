// ===== Website settings (safe to edit) =====
// Google Analytics: paste the Measurement ID from your Google Analytics account between the quotes.
// It looks like 'G-XXXXXXXXXX'. Leave it empty and nothing is tracked.
const ANALYTICS_MEASUREMENT_ID = '';
// 'granted' = analytics runs until a visitor presses Reject (current choice).
// 'denied'  = analytics only runs after a visitor presses Accept (what UK rules prefer).
const ANALYTICS_DEFAULT_CONSENT = 'granted';

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
    window.addEventListener('load', () => setTimeout(dismissPreloader, 400));
    setTimeout(dismissPreloader, 2500); // fallback
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
  // Compare without the .html suffix so Firebase clean URLs (/bio) still match "bio.html"
  const pageKey = (s) => (s || '').split('/').pop().replace(/\.html$/, '') || 'index';
  const currentPage = pageKey(window.location.pathname);
  document.querySelectorAll('.nav-link').forEach(link => {
    if (pageKey(link.getAttribute('href')) === currentPage) link.classList.add('active');
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
  // Skip bare "#" links (the footer "Cookie settings" link): '#' is not a valid selector
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
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

    const count = window.innerWidth > 768 ? 38 : 18;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.setProperty('--size', Math.random() * 3.5 + 1.5 + 'px');
      particle.style.setProperty('--duration', Math.random() * 8 + 6 + 's');
      particle.style.setProperty('--delay', (i < 8 ? Math.random() * 0.3 : Math.random() * 8) + 's');
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
        // Leave new-tab, new-window and download clicks to the browser (Ctrl/Cmd/Shift/Alt, middle button)
        if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        const linkTarget = (link.getAttribute('target') || '').toLowerCase();
        if ((linkTarget && linkTarget !== '_self') || link.hasAttribute('download')) return;
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

  // ══════════════════════════════════════════════════════════════
  //  COOKIE BANNER + ANALYTICS CONSENT
  //  Settings are at the top of this file. The visitor's choice is
  //  stored as "vt-cookie-consent" ("accepted|<ISO time>" or
  //  "rejected|<ISO time>") in localStorage and in a 12-month cookie.
  //  Footer links with [data-cookie-settings] reopen the banner.
  // ══════════════════════════════════════════════════════════════
  {
    const CONSENT_KEY = 'vt-cookie-consent';
    const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 12 months, in seconds
    const gaId = String(ANALYTICS_MEASUREMENT_ID || '').trim();
    let choice = null; // 'accepted', 'rejected' or null (not chosen yet)
    let gaLoaded = false;
    let banner = null;
    let hideTimer = null;
    let returnFocusTo = null;

    const parseChoice = (raw) => {
      if (!raw) return null;
      const [value, at] = String(raw).split('|');
      const time = Date.parse(at);
      if ((value !== 'accepted' && value !== 'rejected') || isNaN(time)) return null;
      if (Date.now() - time > CONSENT_MAX_AGE * 1000) return null; // older than 12 months: ask again
      return { value, time };
    };

    // Newest valid choice from the cookie or localStorage, or null if the visitor has not chosen
    const readChoice = () => {
      const found = [];
      try {
        const pair = document.cookie.split('; ').find((c) => c.indexOf(CONSENT_KEY + '=') === 0);
        if (pair) found.push(parseChoice(pair.slice(CONSENT_KEY.length + 1)));
      } catch (e) { /* cookies unavailable */ }
      try {
        found.push(parseChoice(localStorage.getItem(CONSENT_KEY)));
      } catch (e) { /* storage unavailable */ }
      const latest = found.filter(Boolean).sort((a, b) => b.time - a.time)[0];
      return latest ? latest.value : null;
    };

    const saveChoice = (value) => {
      const stored = value + '|' + new Date().toISOString();
      try {
        localStorage.setItem(CONSENT_KEY, stored);
      } catch (e) { /* storage unavailable */ }
      try {
        document.cookie = CONSENT_KEY + '=' + stored + '; max-age=' + CONSENT_MAX_AGE + '; path=/; SameSite=Lax' +
          (location.protocol === 'https:' ? '; Secure' : '');
      } catch (e) { /* cookies unavailable */ }
    };

    const analyticsAllowed = (value) =>
      value === 'accepted' || (value === null && ANALYTICS_DEFAULT_CONSENT === 'granted');

    // Delete Google Analytics cookies (_ga, _ga_<id>, legacy _gid/_gat) for this host and its parent domains
    const clearAnalyticsCookies = () => {
      let names = [];
      try {
        names = document.cookie.split(';').map((c) => c.split('=')[0].trim())
          .filter((name) => /^_ga($|_)|^_gid$|^_gat/.test(name));
      } catch (e) { return; }
      if (!names.length) return;
      const host = location.hostname;
      const domains = [''];
      if (host.indexOf('.') > 0 && host.indexOf(':') === -1 && !/^[\d.]+$/.test(host)) {
        const labels = host.split('.');
        for (let i = 0; i < labels.length - 1; i++) domains.push('.' + labels.slice(i).join('.'));
      }
      names.forEach((name) => domains.forEach((domain) => {
        try {
          document.cookie = name + '=; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' +
            (domain ? '; domain=' + domain : '');
        } catch (e) { /* cookies unavailable */ }
      }));
    };

    const startAnalytics = () => {
      if (!gaId) return;
      window['ga-disable-' + gaId] = false;
      if (gaLoaded) {
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
        return;
      }
      gaLoaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      window.gtag('js', new Date());
      window.gtag('config', gaId, { anonymize_ip: true });
      const tag = document.createElement('script');
      tag.async = true;
      tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
      // A Reject pressed while gtag.js was still downloading: tidy up anything it wrote
      tag.addEventListener('load', () => {
        if (!analyticsAllowed(choice)) setTimeout(clearAnalyticsCookies, 500);
      });
      document.head.appendChild(tag);
    };

    const stopAnalytics = () => {
      if (gaId) window['ga-disable-' + gaId] = true;
      if (gaLoaded) {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied'
        });
      }
      clearAnalyticsCookies();
    };

    const applyChoice = () => (analyticsAllowed(choice) ? startAnalytics() : stopAnalytics());

    // Pages in /projects/ sit one folder down; 404.html loads this script root-relative because
    // Firebase serves it at whatever depth the missing URL had, so its link is root-relative too
    const privacyHref = () => {
      const ownScript = document.querySelector('script[src$="script.js"]');
      if (ownScript && ownScript.getAttribute('src').charAt(0) === '/') return '/privacy.html';
      const parts = location.pathname.split('/');
      return (parts[parts.length - 2] === 'projects' ? '../' : '') + 'privacy.html';
    };

    const setCursorHover = (on) => {
      document.querySelectorAll('.cursor-dot, .cursor-ring').forEach((el) => el.classList.toggle('hovering', on));
    };

    const buildBanner = () => {
      const el = document.createElement('div');
      el.className = 'cookie-banner';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Cookie choices');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-describedby', 'cookieBannerText');
      el.hidden = true;

      const text = document.createElement('p');
      text.className = 'cookie-banner-text';
      text.id = 'cookieBannerText';
      text.textContent = 'This site uses cookies for anonymous visit statistics and for embedded YouTube videos. ';
      const link = document.createElement('a');
      link.href = privacyHref();
      link.textContent = 'Privacy Policy';
      text.appendChild(link);

      const actions = document.createElement('div');
      actions.className = 'cookie-banner-actions';
      [['accepted', 'Accept', 'accept'], ['rejected', 'Reject', 'reject']].forEach(([value, label, modifier]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cookie-banner-btn cookie-banner-btn--' + modifier;
        btn.dataset.cookieChoice = value;
        btn.textContent = label;
        actions.appendChild(btn);
      });

      el.append(text, actions);
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cookie-choice]');
        if (btn) choose(btn.dataset.cookieChoice);
      });
      // Same hover feedback as other links and buttons when the custom cursor is on
      if (document.body.classList.contains('has-custom-cursor')) {
        el.querySelectorAll('a, button').forEach((target) => {
          target.addEventListener('mouseenter', () => setCursorHover(true));
          target.addEventListener('mouseleave', () => setCursorHover(false));
        });
      }
      document.body.prepend(el); // first in the tab order
      return el;
    };

    // While the banner is up, the footer gets this much extra bottom padding (see styles.css)
    // so the last lines of the page can always scroll clear of it
    let bannerResize = null;
    const reserveSpace = (on) => {
      const root = document.documentElement;
      if (!on) {
        root.style.removeProperty('--cookie-banner-space');
        if (bannerResize) bannerResize.disconnect();
        return;
      }
      const update = () => root.style.setProperty('--cookie-banner-space', banner.offsetHeight + 'px');
      update();
      if ('ResizeObserver' in window) {
        bannerResize = bannerResize || new ResizeObserver(update);
        bannerResize.observe(banner);
      }
    };

    const showBanner = (moveFocus) => {
      if (!banner) banner = buildBanner();
      clearTimeout(hideTimer);
      banner.hidden = false;
      void banner.offsetWidth; // start the entrance transition from the hidden state
      banner.classList.add('is-visible');
      reserveSpace(true);
      if (moveFocus) banner.querySelector('button').focus({ preventScroll: true });
    };

    const hideBanner = () => {
      if (!banner) return;
      banner.classList.remove('is-visible');
      reserveSpace(false);
      setCursorHover(false);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { banner.hidden = true; }, 600);
      if (returnFocusTo) {
        returnFocusTo.focus({ preventScroll: true });
        returnFocusTo = null;
      }
    };

    const choose = (value) => {
      choice = value;
      saveChoice(value);
      applyChoice();
      hideBanner();
    };

    choice = readChoice();
    applyChoice();

    // First visit: show the banner once the preloader (if the page has one) has slid away
    if (choice === null) {
      const reveal = () => { if (choice === null) showBanner(false); };
      const preloaderEl = document.getElementById('preloader');
      if (preloaderEl && !preloaderEl.classList.contains('hidden') && 'MutationObserver' in window) {
        const watcher = new MutationObserver(() => {
          if (preloaderEl.classList.contains('hidden')) {
            watcher.disconnect();
            setTimeout(reveal, 500);
          }
        });
        watcher.observe(preloaderEl, { attributes: true, attributeFilter: ['class'] });
      } else {
        setTimeout(reveal, 900);
      }
    }

    // "Cookie settings" links reopen the banner
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (!trigger) return;
      e.preventDefault();
      returnFocusTo = trigger;
      showBanner(true);
    });

    // Escape never records a choice; it only closes a banner reopened after a choice was made
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && choice !== null && banner && banner.classList.contains('is-visible')) hideBanner();
    });

    // Back/forward cache: pick up a choice made on another page
    window.addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      choice = readChoice();
      applyChoice();
      if (choice !== null && banner && banner.classList.contains('is-visible')) hideBanner();
    });
  }

});

// ══════════════════════════════════════════════════════════════
//  LIGHTBOX
// ══════════════════════════════════════════════════════════════
function openLightbox(el) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const img = el.tagName === 'IMG' ? el : el.querySelector('img');
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
