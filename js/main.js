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

// ── TESTIMONIAL CAROUSEL AUTO-ROTATE ─────────────────────────────
const carousel = document.querySelector('.testimonials-carousel');
if (carousel) {
  const slides = carousel.querySelectorAll('.testimonial-slide');
  let currentIndex = 0;

  function rotateCarousel() {
    slides.forEach((slide, i) => {
      slide.style.opacity = i === currentIndex ? '1' : '0';
      slide.style.pointerEvents = i === currentIndex ? 'auto' : 'none';
    });
    currentIndex = (currentIndex + 1) % slides.length;
  }

  // Auto-rotate every 7 seconds
  if (slides.length > 1) setInterval(rotateCarousel, 7000);
  rotateCarousel(); // Initial setup
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
