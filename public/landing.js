const headingElement = document.getElementById('animatedHeading');
if (headingElement) {
  headingElement.style.color = '#D4AF37';
  headingElement.style.textShadow = '0 0 30px rgba(212, 175, 55, 0.3), 0 0 60px rgba(212, 175, 55, 0.15)';
}

function playWelcomeAnimation() {
  const overlay = document.getElementById('welcomeOverlay');

  if (!overlay) {
    return;
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    overlay.remove();
    return;
  }

  const alreadyPlayed = localStorage.getItem('introPlayed') === 'true';
  if (alreadyPlayed) {
    overlay.remove();
    return;
  }

  const logo = overlay.querySelector('.welcome-logo span');
  const tagline = overlay.querySelector('.welcome-tagline');
  const skipBtn = overlay.querySelector('.skip-intro');

  logo.classList.add('welcome-logo-animate');
  tagline.classList.add('welcome-tagline-animate');

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    overlay.classList.add('welcome-overlay-hide');
    overlay.setAttribute('aria-hidden', 'true');
    localStorage.setItem('introPlayed', 'true');
    overlay.addEventListener('animationend', () => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
  };

  skipBtn.addEventListener('click', finish);
  setTimeout(finish, 3000);
}

window.addEventListener('load', () => {
  playWelcomeAnimation();
});

const navbar = document.querySelector('.navbar');
const mobileToggle = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

mobileToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  mobileToggle.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    mobileToggle.classList.remove('active');
  });
});

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.service-card, .why-card, .structure-card, .mv-card, .stat-card, .testimonial-card, .team-card, .timeline-item').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(30px)';
  card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(card);
});

function countUp(element) {
  const target = parseInt(element.getAttribute('data-target'));
  let current = 0;
  const increment = Math.ceil(target / 30);

  const updateCount = () => {
    current += increment;
    if (current >= target) {
      element.textContent = target;
    } else {
      element.textContent = current;
      requestAnimationFrame(updateCount);
    }
  };

  updateCount();
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.counted) {
      entry.target.dataset.counted = 'true';
      countUp(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(stat => {
  statsObserver.observe(stat);
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offsetTop = target.offsetTop - 70;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  });
});

const heroOverlay = document.querySelector('.hero-overlay');
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
});

function animateBackground() {
  const xOffset = (mouseX - 0.5) * 30;
  const yOffset = (mouseY - 0.5) * 30;

  if (heroOverlay) {
    heroOverlay.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
  }

  requestAnimationFrame(animateBackground);
}

animateBackground();

const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = newsletterForm.querySelector('input[type="email"]').value;

    const button = newsletterForm.querySelector('button');
    const originalText = button.textContent;

    button.textContent = 'Subscribed!';
    button.style.background = 'var(--gold)';
    button.disabled = true;

    // launch gentle confetti
    fireConfetti();

    setTimeout(() => {
      newsletterForm.reset();
      button.textContent = originalText;
      button.style.background = '';
      button.disabled = false;
    }, 3000);
  });
}

/* Theme toggle */
const themeToggle = document.querySelector('.theme-toggle');
function setTheme(isLight) {
  if (isLight) {
    document.body.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.remove('light-theme');
    localStorage.setItem('theme', 'dark');
  }
}
if (themeToggle) {
  // initialize theme
  const saved = localStorage.getItem('theme');
  if (saved === 'light') setTheme(true);

  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    setTheme(isLight);
  });
}

/* Scroll progress */
const progressBar = document.getElementById('progressBar');
window.addEventListener('scroll', () => {
  const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
  if (progressBar) {
    progressBar.style.width = scrolled + '%';
  }
});

/* Staff card tilt */
const staffCards = document.querySelectorAll('.staff-card');
staffCards.forEach(card => {
  card.classList.add('tilt');
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const rotateY = ((x - midX) / midX) * 6; // degrees
    const rotateX = -((y - midY) / midY) * 6;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

/* Confetti */
function fireConfetti() {
  const colors = ['#D4AF37','#ffdd57','#ffd6a5','#fed7aa','#ffe8c2'];
  const confetti = document.createElement('div');
  confetti.style.position = 'fixed';
  confetti.style.left = '50%';
  confetti.style.top = '20%';
  confetti.style.pointerEvents = 'none';
  confetti.style.zIndex = 2000;
  document.body.appendChild(confetti);

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    const size = Math.floor(Math.random() * 8) + 6;
    const left = (Math.random() - 0.5) * 400;
    const rotate = Math.random() * 360;
    piece.style.position = 'absolute';
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.6}px`;
    piece.style.left = `${left}px`;
    piece.style.top = '0px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = '2px';
    piece.style.transform = `rotate(${rotate}deg)`;
    piece.style.opacity = '1';
    piece.style.transition = `transform ${1.5 + Math.random()}s cubic-bezier(.2,.8,.2,1), opacity 0.6s linear`;

    confetti.appendChild(piece);

    setTimeout(() => {
      piece.style.transform = `translateY(${300 + Math.random() * 300}px) translateX(${left * 2}px) rotate(${rotate + 360}deg)`;
      piece.style.opacity = '0';
    }, 50 + Math.random() * 90);
  }

  setTimeout(() => {
    document.body.removeChild(confetti);
  }, 2500);
}

function createFloatingParticles() {
  const particlesContainer = document.createElement('div');
  particlesContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: -1;
  `;
  document.body.appendChild(particlesContainer);

  for (let i = 0; i < 5; i++) {
    const particle = document.createElement('div');
    const size = Math.random() * 4 + 2;
    const delay = Math.random() * 5;
    const duration = Math.random() * 15 + 15;
    const startX = Math.random() * 100;

    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: rgba(212, 175, 55, 0.1);
      border-radius: 50%;
      left: ${startX}%;
      top: -10px;
      opacity: 0;
      animation: float ${duration}s linear ${delay}s infinite;
    `;

    particlesContainer.appendChild(particle);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0% {
        transform: translateY(0) translateX(0);
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      90% {
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) translateX(100px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

createFloatingParticles();

window.addEventListener('scroll', () => {
  const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
  document.body.style.backgroundImage = `linear-gradient(135deg, #050d1a 0%, #0A1A2F ${50 + scrollPercent * 0.1}%, #142842 100%)`;
}, { passive: true });

document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const faqItem = question.parentElement;
    const isActive = faqItem.classList.contains('active');

    document.querySelectorAll('.faq-item').forEach(item => {
      item.classList.remove('active');
    });

    if (!isActive) {
      faqItem.classList.add('active');
    }
  });
});

function initializeMap() {
  if (typeof L === 'undefined') {
    return;
  }

  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  const map = L.map('map').setView([-6.7924, 39.2083], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  const marker = L.marker([-6.7924, 39.2083]).addTo(map);
  marker.bindPopup('<strong>MWITONGO E&E CO. LTD</strong><br>Kigamboni, Dar es Salaam<br>Tanzania').openPopup();

  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeMap, 500);
});
