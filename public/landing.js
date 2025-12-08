const companyName = "MWITONGO E&E CO. LTD";
const typingSpeed = 100;
const growDuration = 800;
const colorTransitionDuration = 1500;

let charIndex = 0;
const headingElement = document.getElementById('animatedHeading');

function typeText() {
  if (charIndex < companyName.length) {
    headingElement.textContent += companyName.charAt(charIndex);
    charIndex++;
    setTimeout(typeText, typingSpeed);
  } else {
    setTimeout(growText, 300);
  }
}

function growText() {
  headingElement.style.transition = `transform ${growDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
  headingElement.style.transform = 'scale(1.08)';

  setTimeout(() => {
    headingElement.style.transition = `transform ${growDuration * 0.6}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    headingElement.style.transform = 'scale(1)';
  }, growDuration);
}

headingElement.style.color = '#D4AF37';
headingElement.style.textShadow = '0 0 30px rgba(212, 175, 55, 0.3), 0 0 60px rgba(212, 175, 55, 0.15)';

window.addEventListener('load', () => {
  setTimeout(typeText, 500);
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

    setTimeout(() => {
      newsletterForm.reset();
      button.textContent = originalText;
      button.style.background = '';
      button.disabled = false;
    }, 3000);
  });
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
