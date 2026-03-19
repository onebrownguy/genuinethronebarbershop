/* ============================================================
   Genuine Throne Barbershop — main.js
   ============================================================ */

// ── NAV SHRINK ON SCROLL ──────────────────────────────────────
const nav = document.getElementById('mainNav');

function updateNav() {
  const scrolled = window.scrollY > 60;
  const wide     = window.innerWidth > 900;
  nav.style.padding = scrolled
    ? (wide ? '10px 48px' : '10px 24px')
    : (wide ? '16px 48px' : '14px 24px');
}

window.addEventListener('scroll', updateNav, { passive: true });
window.addEventListener('resize', updateNav, { passive: true });

// ── MOBILE MENU ──────────────────────────────────────────────
const mobileMenu = document.getElementById('mobileMenu');
const hamburger  = document.getElementById('hamburger');

function openMobile() {
  mobileMenu.classList.add('open');
  hamburger.classList.add('open');
  document.body.style.overflow = 'hidden';
  hamburger.setAttribute('aria-expanded', 'true');
}

function closeMobile() {
  mobileMenu.classList.remove('open');
  hamburger.classList.remove('open');
  document.body.style.overflow = '';
  hamburger.setAttribute('aria-expanded', 'false');
}

function toggleMobile() {
  mobileMenu.classList.contains('open') ? closeMobile() : openMobile();
}

hamburger.addEventListener('click', toggleMobile);

// Close mobile menu when a link is tapped
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMobile);
});

// Close mobile menu on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMobile();
});

// ── SCROLL REVEAL ─────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 60);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── FAQ ACCORDION ─────────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item    = btn.parentElement;
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
  jesus:    'https://booksy.com/en-us/956936_jesus-barber_barber-shop_7_usa',
  alain:    'https://booksy.com/en-us/931858_gzalez-barber_barber-shop_134608_austin',
  kelvin:   'https://booksy.com/en-us/2501_genuine-throne-barbershop-kelvinbarber_barber-shop_7_usa',
  santiago: 'https://booksy.com/en-us/1360130_santiago-blendzz_barber-shop_37500_leander',
  julio:    'https://booksy.com/en-us/933271_julio-barber_barber-shop_134608_austin',
  edy:      'https://booksy.com/en-us/instant-experiences/widget/1148599',
};

document.querySelectorAll('.barber-book-btn[data-barber]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.barber;
    const url = BARBER_LINKS[key];
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  });
});

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
