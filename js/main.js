/* ============================================================
   Genuine Throne Barbershop — main.js
   ============================================================ */

// ── NAV SHRINK ON SCROLL ──────────────────────────────────────
const nav = document.getElementById('mainNav');

let navScrolled = null;
let navTicking  = false;

function updateNav() {
  navTicking = false;
  if (!nav) return;
  const scrolled = window.scrollY > 60;
  if (scrolled === navScrolled) return;      // no work when state is unchanged
  navScrolled = scrolled;
  nav.classList.toggle('scrolled', scrolled); // class, not inline style —
                                              // inline styles outrank the media queries
}

function requestNavUpdate() {
  if (navTicking) return;
  navTicking = true;
  requestAnimationFrame(updateNav);
}

window.addEventListener('scroll', requestNavUpdate, { passive: true });
window.addEventListener('resize', requestNavUpdate, { passive: true });
updateNav(); // set initial state for deep links / restored scroll positions

// ── MOBILE MENU ──────────────────────────────────────────────
const mobileMenu = document.getElementById('mobileMenu');
const hamburger  = document.getElementById('hamburger');

let lockedScrollY = 0;

function openMobile() {
  lockedScrollY = window.scrollY;
  mobileMenu.classList.add('open');
  hamburger.classList.add('open');
  // position:fixed lock — overflow:hidden alone does not stop touch
  // scrolling of the background on iOS Safari.
  document.body.classList.add('menu-open');
  document.body.style.position = 'fixed';
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.overflow = 'hidden';
  hamburger.setAttribute('aria-expanded', 'true');
}

function closeMobile() {
  mobileMenu.classList.remove('open');
  hamburger.classList.remove('open');
  document.body.classList.remove('menu-open');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.overflow = '';
  window.scrollTo(0, lockedScrollY);
  hamburger.setAttribute('aria-expanded', 'false');
}

function toggleMobile() {
  mobileMenu.classList.contains('open') ? closeMobile() : openMobile();
}

if (mobileMenu && hamburger) {
  hamburger.addEventListener('click', toggleMobile);

  // Close mobile menu when a link is tapped
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobile);
  });

  // Close mobile menu on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMobile();
  });

  // Close on resize past the breakpoint — above 900px the hamburger is
  // display:none, so an open menu would have no way to close.
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && mobileMenu.classList.contains('open')) closeMobile();
  }, { passive: true });
}

// ── SCROLL REVEAL ─────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealObserver = new IntersectionObserver((entries) => {
  // Stagger by position among the entries actually revealing, not among all
  // entries in the batch — otherwise the delay depends on browser batching.
  entries.filter(e => e.isIntersecting).forEach((entry, i) => {
    setTimeout(() => entry.target.classList.add('visible'), prefersReducedMotion ? 0 : i * 60);
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── FAQ ACCORDION ─────────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item    = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });

    // Open clicked (if it wasn't already open)
    if (!wasOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ── BARBER BOOKING BUTTONS ────────────────────────────────────
const BARBER_LINKS = {
  cruz:     'https://booksy.com/en-us/287080_cruzycruzcial_barber-shop_7_usa',
  santiago: 'https://booksy.com/en-us/1360130_santiago-blendzz_barber-shop_134608_austin',
  julio:    'https://booksy.com/en-us/933271_julio-barber_barber-shop_134608_austin',
  edy:      'https://booksy.com/en-us/instant-experiences/widget/1148599',
  gzalez:   'https://booksy.com/en-us/931858_gzalez-barber_barber-shop_134608_austin',
};

document.querySelectorAll('.barber-book-btn[data-barber]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.barber;
    const url = BARBER_LINKS[key];
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  });
});

// ── BARBER FILTER ────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Filter barber cards
    document.querySelectorAll('.barber-card').forEach(card => {
      if (filter === 'all') {
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
      } else {
        const specialties = card.dataset.specialty.split(' ');
        const matches = specialties.includes(filter);
        card.style.opacity = matches ? '1' : '0.4';
        card.style.pointerEvents = matches ? 'auto' : 'none';
      }
    });
  });
});

// ── TESTIMONIAL CAROUSEL AUTO-ROTATE + SWIPE ──────────────────────
const carousel = document.querySelector('.testimonials-carousel');
if (carousel) {
  const slides = carousel.querySelectorAll('.testimonial-slide');
  let currentIndex = 0;
  let touchStartX = 0;
  let touchEndX = 0;
  let autoRotateTimer;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.style.opacity = i === index ? '1' : '0';
      slide.style.pointerEvents = i === index ? 'auto' : 'none';
    });
  }

  function rotateCarousel() {
    currentIndex = (currentIndex + 1) % slides.length;
    showSlide(currentIndex);
  }

  // Carousel mode is mobile-only. Above 900px the CSS lays all three slides out
  // in a grid, so hiding two of them would leave empty columns.
  const carouselMQ = window.matchMedia('(max-width: 900px)');

  function resetAutoRotate() {
    clearInterval(autoRotateTimer);
    if (slides.length > 1 && carouselMQ.matches && !prefersReducedMotion) {
      autoRotateTimer = setInterval(rotateCarousel, 7000);
    }
  }

  // Swipe handlers
  carousel.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    clearInterval(autoRotateTimer);
  }, false);

  carousel.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        currentIndex = (currentIndex + 1) % slides.length; // Swipe left → next
      } else {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length; // Swipe right → prev
      }
      showSlide(currentIndex);
    }
    resetAutoRotate();
  }, false);

  // Clear the inline opacity/pointer-events so the desktop grid shows every slide.
  function showAllSlides() {
    slides.forEach(slide => {
      slide.style.opacity = '';
      slide.style.pointerEvents = '';
    });
  }

  // Rotate on mobile; show the full grid on desktop. Re-runs on breakpoint
  // change so resizing across 900px never strands hidden slides.
  function syncCarousel() {
    clearInterval(autoRotateTimer);
    if (slides.length > 1 && carouselMQ.matches) {
      currentIndex = 0;
      showSlide(0);
      resetAutoRotate();
    } else {
      showAllSlides();
    }
  }

  syncCarousel();
  carouselMQ.addEventListener('change', syncCarousel);
}

// ── ACTIVE NAV LINK (SCROLL SPY) ─────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => spyObserver.observe(s));

// ── WALK-IN LIVE STATUS ───────────────────────────────────────
// Progressive enhancement. The hero stat and sticky bar ship with the static
// "Walk-Ins Welcome" copy; this only overwrites it when /api/status reports
// live:true (fresh staff update, inside business hours). Any failure — no JS,
// network error, stale record, after close — leaves the static copy alone.
(function () {
  var stat  = document.getElementById('walkinStat');
  var strip = document.getElementById('bookbarStatus');
  var bar   = document.querySelector('.mobile-book-bar');
  if (!stat && !strip) return;

  var CHECK = '\u2713';        // check mark
  var DASH  = '\u2014';        // em dash

  var COPY = {
    open:   { num: CHECK, label: 'Walk In Now',       en: 'Walk in now ' + DASH + ' no wait', es: 'Pasa ahora, sin espera' },
    closed: { num: DASH,  label: 'Appointments Only', en: 'Appointments only right now',      es: 'Solo con cita ahora' }
  };

  // The bar is fixed, so the body reserves room for it. Its height changes when
  // the status strip appears, so re-measure instead of hard-coding a value.
  function syncBarPadding() {
    if (!bar) return;
    if (getComputedStyle(bar).display === 'none') {
      document.body.style.paddingBottom = '';
      return;
    }
    document.body.style.paddingBottom = (bar.offsetHeight + 4) + 'px';
  }

  function render(d) {
    if (!d || !d.live) return;                    // uncertain => keep static copy
    var state = d.state;
    if (state !== 'open' && state !== 'wait' && state !== 'closed') return;

    var isWait = state === 'wait';
    var c      = COPY[state] || {};
    var num    = isWait ? d.waitMinutes + 'm' : c.num;
    var label  = isWait ? 'Walk-In Wait' : c.label;
    var en     = isWait ? 'About ' + d.waitMinutes + ' min wait' : c.en;
    var es     = isWait ? '~' + d.waitMinutes + ' min de espera'  : c.es;

    if (stat) {
      var n = stat.querySelector('.stat-num');
      var l = stat.querySelector('.stat-label');
      if (n) n.textContent = num;
      if (l) l.textContent = label;
      stat.classList.remove('is-open', 'is-wait', 'is-closed');
      stat.classList.add('is-' + state);
    }

    if (strip) {
      strip.classList.remove('is-open', 'is-wait', 'is-closed');
      strip.classList.add('is-' + state);
      strip.textContent = '';
      var dot = document.createElement('span');
      dot.className = 'dot';
      var a = document.createElement('span');
      a.textContent = en;
      var b = document.createElement('span');
      b.className = 'es';
      b.setAttribute('lang', 'es');
      b.textContent = es;
      strip.appendChild(dot);
      strip.appendChild(a);
      strip.appendChild(b);
      strip.hidden = false;
      syncBarPadding();
    }
  }

  function load() {
    fetch('/api/status', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(render)
      .catch(function () { /* stay on the static copy */ });
  }

  load();
  setInterval(load, 90000);
  window.addEventListener('resize', syncBarPadding, { passive: true });
})();
