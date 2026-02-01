function initHeroRipples() {
  if (!window.jQuery || !jQuery.fn || typeof jQuery.fn.ripples !== 'function') return;
  const target = jQuery('.full-landing-image');
  if (!target.length) return;
  const heroEl = target.get(0);
  try {
    target.ripples({
      resolution: 556,
      perturbance: 0.2
    });
  } catch (e) {}

  const isHeroVisible = () => {
    if (!heroEl) return false;
    const rect = heroEl.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  };

  let lastDrop = 0;
  const dropRipple = (x, y, radius, strength) => {
    if (!heroEl) return;
    try {
      target.ripples('drop', x, y, radius, strength);
    } catch (e) {}
  };

  const randomDrop = () => {
    if (!heroEl || !isHeroVisible()) return;
    const now = Date.now();
    if (now - lastDrop < 350) return;
    lastDrop = now;
    const rect = heroEl.getBoundingClientRect();
    const x = rect.width * (0.25 + Math.random() * 0.5);
    const y = rect.height * (0.2 + Math.random() * 0.6);
    const radius = Math.min(rect.width, rect.height) * 0.18;
    dropRipple(x, y, radius, 0.035);
  };

  let boostUntil = 0;
  let boostTimer = null;
  const startRippleBoost = (durationMs = 5000) => {
    boostUntil = Math.max(boostUntil, Date.now() + durationMs);
    if (boostTimer) return;
    boostTimer = setInterval(() => {
      if (Date.now() > boostUntil) {
        clearInterval(boostTimer);
        boostTimer = null;
        return;
      }
      randomDrop();
    }, 650);
  };

  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      randomDrop();
      startRippleBoost(5000);
      scrollTicking = false;
    });
  }, { passive: true });

  heroEl.addEventListener('click', (e) => {
    const rect = heroEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const radius = Math.min(rect.width, rect.height) * 0.22;
    dropRipple(x, y, radius, 0.06);
    startRippleBoost(5000);
  });
}

function initCursorGlow() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (prefersReducedMotion || isTouch) return;
  if (document.getElementById('cursorGlow')) return;

  const glow = document.createElement('div');
  glow.id = 'cursorGlow';
  document.body.appendChild(glow);

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let targetX = x;
  let targetY = y;
  let rafId = null;

  const update = () => {
    x += (targetX - x) * 0.12;
    y += (targetY - y) * 0.12;
    glow.style.transform = `translate3d(${x - 120}px, ${y - 120}px, 0)`;
    rafId = requestAnimationFrame(update);
  };

  const handleMove = (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    glow.classList.add('is-visible');
    if (!rafId) rafId = requestAnimationFrame(update);
  };

  const handleLeave = () => {
    glow.classList.remove('is-visible');
  };

  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseout', handleLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) glow.classList.remove('is-visible');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initHeroRipples();
    initCursorGlow();
  });
} else {
  initHeroRipples();
  initCursorGlow();
}

let cachedVoices = [];
function loadSpeechVoices() {
  if (!('speechSynthesis' in window)) return;
  cachedVoices = window.speechSynthesis.getVoices();
}
if ('speechSynthesis' in window) {
  loadSpeechVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadSpeechVoices);
}

function pickNaturalVoice() {
  const voices = cachedVoices.length ? cachedVoices : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
  if (!voices || !voices.length) return null;
  const preferred = voices.find(v => /en/i.test(v.lang || '') && /samantha|ava|allison|zira|moira|serena|victoria|google uk english female|google us english/i.test(v.name || '')) ||
    voices.find(v => /en/i.test(v.lang || '') && /female|zira|samantha|google|english/i.test(v.name || '')) ||
    voices.find(v => /en/i.test(v.lang || '')) ||
    voices[0];
  return preferred || null;
}

/* --- Image cropper modal --- */
function openCropperModal(defaultSrc, onApply) {
  // create modal elements
  const modal = document.createElement('div');
  modal.className = 'cropper-modal';

  const win = document.createElement('div');
  win.className = 'cropper-window';

  win.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
      <div style="font-weight:700">Photo Cropper</div>
      <div style="font-size:0.9rem;color:var(--gray)">Use mouse drag to move, mouse wheel to zoom</div>
    </div>
    <div class="crop-area">
      <canvas class="crop-canvas" aria-label="Image crop canvas"></canvas>
    </div>
    <div class="crop-controls">
      <input type="file" accept="image/*" id="cropperFileInput">
      <label style="color:var(--gray);font-size:0.9rem;">Zoom</label>
      <input type="range" id="cropperZoom" min="1" max="3" step="0.01" value="1">
      <div class="crop-actions">
        <button class="cropper-close">Close</button>
        <button class="cropper-apply">Apply & Download</button>
      </div>
    </div>
  `;

  modal.appendChild(win);
  document.body.appendChild(modal);

  const canvas = win.querySelector('.crop-canvas');
  const fileInput = win.querySelector('#cropperFileInput');
  const zoomInput = win.querySelector('#cropperZoom');
  const closeBtn = win.querySelector('.cropper-close');
  const applyBtn = win.querySelector('.cropper-apply');

  const ctx = canvas.getContext('2d');
  // size canvas to area (use devicePixelRatio to ensure crisp export)
  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();

  let img = new Image();
  img.crossOrigin = 'anonymous';
  let imgLoaded = false;
  let scale = 1;
  let offsetX = 0, offsetY = 0;
  let lastX = 0, lastY = 0, dragging = false;

  function draw() {
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width, ch = rect.height;
    if (!imgLoaded) {
      // placeholder
      ctx.fillStyle = '#151515'; ctx.fillRect(0,0,cw,ch);
      ctx.fillStyle = '#666'; ctx.font = '14px sans-serif'; ctx.textAlign='center'; ctx.fillText('No image', cw/2, ch/2);
      return;
    }

    // compute draw size
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const drawW = iw * scale;
    const drawH = ih * scale;

    // center by offsets
    const dx = (cw/2) - drawW/2 + offsetX;
    const dy = (ch/2) - drawH/2 + offsetY;

    ctx.drawImage(img, dx, dy, drawW, drawH);
    // overlay circular mask to preview circular crop
    ctx.save();
    ctx.beginPath();
    const cx = cw/2, cy = ch/2, r = Math.min(cw,ch)/2 - 6;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function loadSrcToImage(src) {
    return new Promise((resolve, reject) => {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { imgLoaded = true; // reset transforms
        scale = Math.max(canvas.width/(img.naturalWidth*(window.devicePixelRatio||1)), canvas.height/(img.naturalHeight*(window.devicePixelRatio||1)));
        offsetX = 0; offsetY = 0; draw(); resolve(); };
      img.onerror = reject;
      img.src = src;
    });
  }

  // load default src if provided
  if (defaultSrc) {
    loadSrcToImage(defaultSrc).catch(()=>{});
  }

  // handle file input
  fileInput.addEventListener('change', (e)=>{
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    loadSrcToImage(url).then(()=>{ URL.revokeObjectURL(url); }).catch(()=>{});
  });

  // dragging
  canvas.addEventListener('pointerdown', (e)=>{ dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e)=>{ if (!dragging) return; const dx = e.clientX - lastX; const dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; offsetX += dx; offsetY += dy; draw(); });
  canvas.addEventListener('pointerup', (e)=>{ dragging = false; try { canvas.releasePointerCapture(e.pointerId);} catch(e){} });
  canvas.addEventListener('pointercancel', ()=>{ dragging = false; });

  // wheel zoom
  canvas.addEventListener('wheel', (e)=>{ e.preventDefault(); const delta = -e.deltaY * 0.0015; const oldScale = scale; scale = Math.max(0.25, Math.min(6, scale * (1 + delta)));
    // adjust offset to zoom toward pointer
    const rect = canvas.getBoundingClientRect(); const px = e.clientX - rect.left - rect.width/2; const py = e.clientY - rect.top - rect.height/2; offsetX -= px*(scale/oldScale - 1); offsetY -= py*(scale/oldScale - 1); draw(); }, { passive:false });

  // zoom input
  zoomInput.addEventListener('input', () => { const v = parseFloat(zoomInput.value); const old = scale; scale = v; draw(); });

  // close
  closeBtn.addEventListener('click', () => { document.body.removeChild(modal); });

  // apply: export circular area to 600x600 and call onApply(dataUrl)
  applyBtn.addEventListener('click', () => {
    if (!imgLoaded) return;
    // create export canvas
    const outSize = 600;
    const out = document.createElement('canvas');
    out.width = outSize; out.height = outSize;
    const octx = out.getContext('2d');
    // compute what portion of the source image is visible in the circle
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width, ch = rect.height;
    // our draw used: dx = (cw/2) - drawW/2 + offsetX; drawW = img.naturalWidth * scale;
    const drawW = img.naturalWidth * scale; const drawH = img.naturalHeight * scale;
    const dx = (cw/2) - drawW/2 + offsetX; const dy = (ch/2) - drawH/2 + offsetY;
    // circle center and radius in canvas CSS pixels
    const cx = cw/2, cy = ch/2, r = Math.min(cw,ch)/2 - 6;

    // For each pixel in output, map to source
    // We'll draw by scaling: compute source rectangle corresponding to circular area bounding box
    const srcLeft = ( (cx - r) - dx ) / drawW * img.naturalWidth;
    const srcTop = ( (cy - r) - dy ) / drawH * img.naturalHeight;
    const srcSize = ( (r*2) / drawW ) * img.naturalWidth;

    // draw the source square into out canvas
    octx.beginPath();
    octx.arc(outSize/2, outSize/2, outSize/2, 0, Math.PI*2);
    octx.closePath();
    octx.save();
    octx.clip();
    // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    octx.drawImage(img, srcLeft, srcTop, srcSize, srcSize, 0, 0, outSize, outSize);
    octx.restore();

    const dataUrl = out.toDataURL('image/jpeg', 0.92);
    // download
    const a = document.createElement('a'); a.href = dataUrl; a.download = 'john-kanyoro-600.jpg'; a.click();
    // callback to apply
    if (typeof onApply === 'function') onApply(dataUrl);
    // close modal
    document.body.removeChild(modal);
  });

  // handle window resize
  window.addEventListener('resize', sizeCanvas);
}

// wire up Edit Photo buttons (delegated)
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.edit-photo-btn');
  if (!btn) return;
  const person = btn.dataset.person || 'user';
  // find corresponding team card image src if present
  const card = document.querySelector(`.team-card[data-name="${person}"]`);
  let currentSrc = null;
  if (card) {
    const wrap = card.querySelector('.team-image');
    const img = wrap && wrap.querySelector('img');
    if (img && img.src) currentSrc = img.src;
  }
  openCropperModal(currentSrc, (dataUrl) => {
    // apply the new image to the card
    if (card) {
      const wrap = card.querySelector('.team-image');
      if (wrap) { wrap.innerHTML = ''; const newImg = document.createElement('img'); newImg.src = dataUrl; newImg.alt = person; wrap.appendChild(newImg); }
    }
  });
});

function playWelcomeAnimation() {
  const overlay = document.getElementById('welcomeOverlay');

  if (!overlay) return;

  const logoImg = overlay.querySelector('.welcome-logo img');
  const tagline = overlay.querySelector('.welcome-tagline');
  const message = overlay.querySelector('.welcome-message');
  const small = overlay.querySelector('.welcome-logo small');
  const divider = overlay.querySelector('.welcome-divider');
  const skipBtn = overlay.querySelector('#skipIntro') || overlay.querySelector('.skip-intro');

  const voiceEl = document.getElementById('welcomeVoice');
  let voicePlayed = false;
  if (voiceEl) {
    voiceEl.muted = false;
    voiceEl.volume = 1;
    voiceEl.playbackRate = 0.95;
    if ('preservesPitch' in voiceEl) voiceEl.preservesPitch = true;
    if ('mozPreservesPitch' in voiceEl) voiceEl.mozPreservesPitch = true;
    if ('webkitPreservesPitch' in voiceEl) voiceEl.webkitPreservesPitch = true;
    try { voiceEl.load(); } catch (e) {}
    voiceEl.addEventListener('play', () => { voicePlayed = true; });
  }

  const speakFallback = () => {
    if (voicePlayed) return false;
    if (!('speechSynthesis' in window)) return false;
    const utter = new SpeechSynthesisUtterance('Welcome to MWITONGO Company Limited.');
    const preferred = pickNaturalVoice();
    if (preferred) {
      utter.voice = preferred;
      utter.lang = preferred.lang || 'en-US';
    } else {
      utter.lang = 'en-US';
    }
    utter.rate = 0.9;
    utter.pitch = 1.03;
    utter.volume = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    voicePlayed = true;
    return true;
  };
  const playIntroSound = () => {
    if (!voiceEl) return Promise.resolve(false);
    try {
      voiceEl.currentTime = 0;
      const playPromise = voiceEl.play();
      if (playPromise && typeof playPromise.then === 'function') {
        return playPromise.then(() => {
          voicePlayed = true;
          return true;
        }).catch(() => false);
      }
      voicePlayed = true;
      return Promise.resolve(true);
    } catch (e) {
      return Promise.resolve(false);
    }
  };

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    overlay.classList.add('welcome-overlay-hide');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('animationend', () => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
  };

  if (skipBtn) skipBtn.addEventListener('click', finish);

  // Try autoplay immediately; if blocked, play on first user interaction anywhere.
  const setupUnlock = () => {
    const unlock = async () => {
      const ok = await playIntroSound();
      if (!ok) speakFallback();
      if (ok || voicePlayed) {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('scroll', unlock);
      }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('scroll', unlock, { passive: true });
  };

  playIntroSound().then((ok) => {
    if (!ok) setupUnlock();
    if (!ok) speakFallback();
  });

  // run professional sequence
  if (logoImg) logoImg.classList.add('welcome-logo-animate');
  if (tagline) tagline.classList.add('welcome-tagline-animate');
  if (message) message.classList.add('welcome-message-animate');
  if (divider) divider.classList.add('welcome-divider-animate');
  if (small) small.classList.add('welcome-subtle-animate');

  // hold for 5 seconds for readability, then fade out
  setTimeout(finish, 5000);
}

function startWelcomeOverlay() {
  const overlay = document.getElementById('welcomeOverlay');
  if (!overlay) return;
  overlay.classList.add('welcome-overlay-visible');
  playWelcomeAnimation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(startWelcomeOverlay, 400);
  });
} else {
  setTimeout(startWelcomeOverlay, 400);
}

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

const testimonialCards = document.querySelectorAll('.testimonial-card');
testimonialCards.forEach(card => {
  const row = card.closest('.testimonials-row');
  if (!row) return;
  const pause = () => row.classList.add('is-paused');
  const resume = () => row.classList.remove('is-paused');
  card.addEventListener('mouseenter', pause);
  card.addEventListener('mouseleave', resume);
  card.addEventListener('focusin', pause);
  card.addEventListener('focusout', resume);
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

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2, rootMargin: '0px 0px -80px 0px' });

const revealTargets = document.querySelectorAll(
  '.section-header, .hero-badge, .hero-subtitle, .hero-feature, .hero-buttons, .trust-item, .newsletter-content, .cta-content, .contact-item, .cert-card, .achievement-card, .support-card, .portfolio-card, .insight-card, .logo-card, .cert-mini-card, .profile-card, .meeting-form, .service-details, .before-after'
);

revealTargets.forEach((el, index) => {
  el.classList.add('reveal');
  el.style.setProperty('--reveal-delay', `${(index % 6) * 80}ms`);
  if (prefersReducedMotion) {
    el.classList.add('in-view');
  } else {
    revealObserver.observe(el);
  }
});

// Personalize leadership team WhatsApp buttons: set message with name & role before opening
function personalizeLeadershipButtons() {
  document.querySelectorAll('.team-card .whatsapp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.team-card');
      const name = (card && card.dataset.name) ? card.dataset.name : (card && card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : 'Team Member');
      const role = (card && card.dataset.role) ? card.dataset.role : (card && card.querySelector('.team-role') ? card.querySelector('.team-role').textContent.trim() : '');
      // prefer per-button or per-card overrides (data-phone / data-text)
      let phone = btn.dataset.phone || (card && card.dataset.phone) || '255763542024';
      // strip any leading + from phone if present
      phone = phone.replace(/^\+/, '');
      const customText = btn.dataset.text || (card && card.dataset.text);
      const text = customText || `Hello ${name}${role ? ' — ' + role : ''}, I would like to enquire about professional services.`;
      // set href to include prefilled message (encode text)
      btn.href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      // allow default navigation to proceed (will open in new tab because anchors have target='_blank')
    });
  });
}

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

function getFormspreeEndpoint() {
  const meta = document.querySelector('meta[name="formspree-endpoint"]');
  const raw = (window && window.FORMSPREE_ENDPOINT) ? window.FORMSPREE_ENDPOINT : (meta ? meta.content : '');
  const endpoint = (raw || '').trim();
  if (!endpoint || endpoint.includes('YOUR_FORMSPREE_ID') || endpoint.includes('REPLACE_WITH_ID')) {
    return '';
  }
  return endpoint;
}

function openMailto(subject, body) {
  const to = 'e.e.eof2025@gmail.com';
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('show', window.scrollY > 300);
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  // Wire the form to Formspree (replace `YOUR_FORMSPREE_ID` with your real endpoint)
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = newsletterForm.querySelector('input[name="email"]').value;
    const button = newsletterForm.querySelector('button');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending...';

    const endpoint = getFormspreeEndpoint();
    if (!endpoint) {
      button.textContent = 'Open Email App';
      openMailto('Newsletter Subscription', `Please subscribe this email: ${email}`);
      setTimeout(() => { newsletterForm.reset(); button.textContent = originalText; button.disabled = false; }, 1200);
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).then(res => {
      if (res.ok) {
        button.textContent = 'Subscribed!';
        button.style.background = 'var(--gold)';
        try { fireConfetti(); } catch (e) {}
        setTimeout(() => { newsletterForm.reset(); button.textContent = originalText; button.style.background = ''; button.disabled = false; }, 2500);
      } else {
        return res.text().then(text => Promise.reject(new Error(text || 'Failed')));
      }
    }).catch(err => {
      console.error('Subscribe error', err);
      button.textContent = 'Try again';
      setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2000);
    });
  });
}

const consultationForm = document.getElementById('consultationForm');
if (consultationForm) {
  consultationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(consultationForm);
    const payload = Object.fromEntries(formData.entries());
    const button = consultationForm.querySelector('button');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Submitting...';

    const endpoint = getFormspreeEndpoint();
    if (!endpoint) {
      const summary = `Name: ${payload.name || ''}\nEmail: ${payload.email || ''}\nPhone: ${payload.phone || ''}\nService: ${payload.service || ''}\nBudget: ${payload.budget || ''}\nTimeline: ${payload.timeline || ''}\nMessage: ${payload.message || ''}`;
      openMailto('Consultation Request', summary);
      setTimeout(() => { consultationForm.reset(); button.textContent = originalText; button.disabled = false; }, 1200);
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => {
      if (res.ok) {
        button.textContent = 'Request Sent';
        try { fireConfetti(); } catch (e) {}
        setTimeout(() => { consultationForm.reset(); button.textContent = originalText; button.disabled = false; }, 2500);
      } else {
        return res.text().then(text => Promise.reject(new Error(text || 'Failed')));
      }
    }).catch(err => {
      console.error('Consultation error', err);
      button.textContent = 'Try again';
      setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2000);
    });
  });
}

function initializeQuickConsult() {
  const wrapper = document.getElementById('quickConsult');
  if (!wrapper) return;
  const toggle = wrapper.querySelector('.quick-consult-toggle');
  const panel = wrapper.querySelector('.quick-consult-panel');
  const closeBtn = wrapper.querySelector('.quick-consult-close');
  const form = wrapper.querySelector('#quickConsultForm');
  let isOpen = false;

  const setOpen = (open) => {
    isOpen = open;
    wrapper.classList.toggle('open', isOpen);
    if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) {
      const firstField = panel && panel.querySelector('input,select,button');
      if (firstField) firstField.focus();
    }
  };

  if (toggle) toggle.addEventListener('click', () => setOpen(!isOpen));
  if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));

  document.addEventListener('click', (e) => {
    if (!isOpen) return;
    if (!wrapper.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) setOpen(false);
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const button = form.querySelector('button');
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending...';

      const endpoint = getFormspreeEndpoint();
      if (!endpoint) {
        const summary = `Name: ${payload.name || ''}\nPhone: ${payload.phone || ''}\nService: ${payload.service || ''}`;
        openMailto('Quick Consultation Request', summary);
        setTimeout(() => { form.reset(); button.textContent = originalText; button.disabled = false; }, 1200);
        return;
      }

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, type: 'quick-consult' })
      }).then(res => {
        if (res.ok) {
          button.textContent = 'Request Sent';
          setTimeout(() => { form.reset(); button.textContent = originalText; button.disabled = false; }, 2000);
        } else {
          return res.text().then(text => Promise.reject(new Error(text || 'Failed')));
        }
      }).catch(err => {
        console.error('Quick consult error', err);
        button.textContent = 'Try again';
        setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2000);
      });
    });
  }
}

function initializeMeetingForm() {
  const meetingForm = document.getElementById('meetingForm');
  if (!meetingForm) return;
  const tzInput = meetingForm.querySelector('input[name="timezone"]');
  if (tzInput && !tzInput.value) {
    try {
      tzInput.value = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) {}
  }

  meetingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(meetingForm);
    const payload = Object.fromEntries(formData.entries());
    const button = meetingForm.querySelector('button');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Submitting...';

    const endpoint = getFormspreeEndpoint();
    if (!endpoint) {
      const summary = `Meeting request\nName: ${payload.name || ''}\nEmail: ${payload.email || ''}\nDate: ${payload.date || ''}\nTime: ${payload.time || ''}\nType: ${payload.meetingType || ''}\nTimezone: ${payload.timezone || ''}\nNotes: ${payload.notes || ''}`;
      openMailto('Meeting Request', summary);
      setTimeout(() => { meetingForm.reset(); button.textContent = originalText; button.disabled = false; }, 1200);
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, type: 'meeting-request' })
    }).then(res => {
      if (res.ok) {
        button.textContent = 'Request Sent';
        setTimeout(() => { meetingForm.reset(); button.textContent = originalText; button.disabled = false; }, 2000);
      } else {
        return res.text().then(text => Promise.reject(new Error(text || 'Failed')));
      }
    }).catch(err => {
      console.error('Meeting request error', err);
      button.textContent = 'Try again';
      setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2000);
    });
  });
}

function initializeServiceTabs() {
  const tabs = document.querySelectorAll('.service-tab');
  const panels = document.querySelectorAll('.service-panel');
  if (!tabs.length || !panels.length) return;

  const activate = (tab) => {
    const key = tab.dataset.tab;
    tabs.forEach(t => {
      const isActive = t === tab;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    panels.forEach(panel => {
      panel.classList.toggle('active', panel.dataset.tab === key);
    });
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activate(tab));
  });

  const activeTab = document.querySelector('.service-tab.active') || tabs[0];
  if (activeTab) activate(activeTab);
}

function initializePortfolioFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.portfolio-card');
  if (!buttons.length || !cards.length) return;

  const applyFilter = (filter) => {
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(',').map(c => c.trim());
      const isVisible = filter === 'all' || categories.includes(filter);
      card.style.display = isVisible ? '' : 'none';
    });
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter || 'all');
    });
  });

  const activeBtn = document.querySelector('.filter-btn.active') || buttons[0];
  if (activeBtn) applyFilter(activeBtn.dataset.filter || 'all');
}

function openPortfolioLightbox({ image, title, desc, meta }) {
  const overlay = document.createElement('div');
  overlay.className = 'portfolio-lightbox';
  overlay.innerHTML = `
    <div class="lightbox-card" role="dialog" aria-modal="true" aria-label="${title}">
      <button class="lightbox-close" type="button" aria-label="Close">×</button>
      <img src="${image}" alt="${title}">
      <div class="lightbox-body">
        <h3>${title}</h3>
        <p>${desc || ''}</p>
        <div class="lightbox-meta">
          <span>${meta || ''}</span>
          <span>Request details via contact form</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => {
    overlay.classList.remove('open');
    setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const closeBtn = overlay.querySelector('.lightbox-close');
  if (closeBtn) closeBtn.addEventListener('click', close);
}

function initializePortfolioLightbox() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.portfolio-view');
    if (!btn) return;
    const image = btn.dataset.image || '';
    const title = btn.dataset.title || 'Project Detail';
    const desc = btn.dataset.desc || '';
    const meta = btn.dataset.meta || '';
    if (image) openPortfolioLightbox({ image, title, desc, meta });
  });
}

function initializeBeforeAfterSliders() {
  document.querySelectorAll('.before-after').forEach(section => {
    const range = section.querySelector('.before-after-range');
    const frame = section.querySelector('.before-after-frame');
    if (!range || !frame) return;
    const update = () => {
      frame.style.setProperty('--reveal', `${range.value}%`);
    };
    range.addEventListener('input', update);
    update();
  });
}

function applyLanguage(lang) {
  const normalized = lang === 'sw' ? 'sw' : 'en';
  document.documentElement.lang = normalized;
  document.body.dataset.lang = normalized;
  document.querySelectorAll('[data-i18n-en]').forEach(el => {
    const value = normalized === 'sw' ? el.dataset.i18nSw : el.dataset.i18nEn;
    if (!value) return;
    const attr = el.dataset.i18nAttr;
    if (attr) {
      el.setAttribute(attr, value);
    } else {
      el.textContent = value;
    }
  });

  document.querySelectorAll('.lang-toggle .lang-code').forEach(code => {
    code.classList.toggle('is-active', code.dataset.lang === normalized);
  });
}

function initializeLanguageToggle() {
  const toggle = document.querySelector('.lang-toggle');
  if (!toggle) return;
  const saved = localStorage.getItem('lang');
  const initial = (saved === 'sw' || saved === 'en') ? saved : 'en';
  applyLanguage(initial);
  toggle.addEventListener('click', () => {
    const next = document.body.dataset.lang === 'sw' ? 'en' : 'sw';
    localStorage.setItem('lang', next);
    applyLanguage(next);
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
  // assign photos after map init delay so DOM is ready
  // personalize leadership WhatsApp button messages
  setTimeout(personalizeLeadershipButtons, 300);
  // try to insert provided local photo for John Kanyoro and crop to face
  setTimeout(assignJohnPhoto, 350);
  // initialize enhanced staff UI (search, filters, modal)
  setTimeout(initializeStaffUI, 400);
  // new UI modules
  initializeLanguageToggle();
  initializeQuickConsult();
  initializeMeetingForm();
  initializeServiceTabs();
  initializePortfolioFilters();
  initializePortfolioLightbox();
  initializeBeforeAfterSliders();
});

// Initialize search, tag filters and profile modal for staff cards
function initializeStaffUI() {
  const searchInput = document.getElementById('staffSearch');
  const tagContainer = document.getElementById('staffTags');
  const staffGrid = document.querySelector('.experienced-staff .staff-grid');
  let activeTag = 'all';

  function filterStaff() {
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    const cards = staffGrid.querySelectorAll('.staff-card');
    cards.forEach(card => {
      const name = (card.dataset.name || (card.querySelector('h3') && card.querySelector('h3').textContent) || '').toLowerCase();
      const role = (card.querySelector('.staff-position') && card.querySelector('.staff-position').textContent || '').toLowerCase();
      const tags = (card.dataset.tags || '').toLowerCase();
      const bio = (card.querySelector('.staff-bio') && card.querySelector('.staff-bio').textContent || '').toLowerCase();

      let visible = true;
      if (activeTag !== 'all' && tags.indexOf(activeTag) === -1) visible = false;
      if (q) {
        if (name.indexOf(q) === -1 && role.indexOf(q) === -1 && tags.indexOf(q) === -1 && bio.indexOf(q) === -1) visible = false;
      }

      card.style.display = visible ? '' : 'none';
    });
  }

  if (tagContainer) {
    tagContainer.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.tag-btn');
      if (!btn) return;
      // toggle active class
      tagContainer.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTag = btn.dataset.tag || 'all';
      filterStaff();
    });
    // set default active
    const allBtn = tagContainer.querySelector('.tag-btn[data-tag="all"]'); if (allBtn) allBtn.classList.add('active');
  }

  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(filterStaff, 160);
    });
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { searchInput.value = ''; filterStaff(); } });
  }

  // Modal creation
  let modalOverlay = null;
  function openProfileModal(card) {
    if (!card) return;
    const name = card.dataset.name || (card.querySelector('h3') && card.querySelector('h3').textContent) || '';
    const role = card.querySelector('.staff-position') ? card.querySelector('.staff-position').textContent : '';
    const bio = card.querySelector('.staff-bio') ? card.querySelector('.staff-bio').textContent : '';
    const expertise = Array.from(card.querySelectorAll('.expertise-tag')).map(t => t.textContent).join(', ');
    // image src (if lazy blob applied earlier, it'll be an object URL)
    const imgEl = card.querySelector('.staff-image img');
    const imgSrc = imgEl ? imgEl.src : '/logo.png';

    // build modal
    modalOverlay = document.createElement('div'); modalOverlay.className = 'staff-modal-overlay';
    const modal = document.createElement('div'); modal.className = 'staff-modal';
    modal.innerHTML = `
      <div class="modal-image"><img src="${imgSrc}" alt="${name}"></div>
      <div class="modal-body">
        <h3>${name}</h3>
        <div class="staff-position">${role}</div>
        <p class="staff-bio">${bio}</p>
        <p class="staff-expertise"><strong>Expertise:</strong> ${expertise}</p>
        <div class="modal-actions">
          <a class="contact-btn contact-wa" href="#" target="_blank" rel="noreferrer">Message (WhatsApp)</a>
          <a class="contact-btn contact-linkedin" href="#" target="_blank" rel="noreferrer">LinkedIn</a>
          <button class="close-modal">Close</button>
        </div>
      </div>
    `;
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    // wire actions
    const waBtn = modal.querySelector('.contact-wa');
    const linkBtn = modal.querySelector('.contact-linkedin');
    const closeBtn = modal.querySelector('.close-modal');

    // Prefill WhatsApp with message using the organization's phone
    const phone = '+255763542024';
    const text = `Hello ${name}, I'm interested in your professional services.`;
    waBtn.href = `https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`;

    // Try to create a LinkedIn search link (no private data needed)
    linkBtn.href = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(name)}`;

    function closeModal() {
      if (modalOverlay && modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
      modalOverlay = null;
      lastFocused && lastFocused.focus();
      document.removeEventListener('keydown', onKey);
    }

    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (ev) => { if (ev.target === modalOverlay) closeModal(); });

    function onKey(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', onKey);

    // focus trap: move focus into modal
    const focusable = modal.querySelectorAll('a,button');
    if (focusable && focusable.length) focusable[0].focus();
    // remember last focused element
    var lastFocused = document.activeElement;
  }

  // wire view-profile buttons
  document.querySelectorAll('.staff-card .view-profile').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.staff-card');
      openProfileModal(card);
    });
  });

  // re-run filter once to apply initial state
  filterStaff();
}

// Insert local John Kanyoro photo (expects /avatars/john-kanyoro.jpg in the public folder)
function assignJohnPhoto() {
  const card = document.querySelector('.team-card[data-name="John Kanyoro"]');
  if (!card) return;
  const wrap = card.querySelector('.team-image');
  if (!wrap) return;
  // prefer a local avatar placed at /avatars/john-kanyoro.jpg
  const localSrc = '/avatars/john-kanyoro.jpg';
  // replace initials
  wrap.innerHTML = '';
  const img = document.createElement('img');
  img.src = localSrc;
  img.alt = 'John Kanyoro';
  img.loading = 'lazy';
  // when loaded, attempt face centering
  img.addEventListener('load', () => {
    cropImageToFace(img).catch(() => {
      // fallback: center
      img.style.objectPosition = '50% 50%';
    });
  });
  // if image cannot be loaded, leave initials
  img.addEventListener('error', () => {
    wrap.innerHTML = '<div class="team-initial">JK</div>';
  });
  wrap.appendChild(img);
}

// Try to detect face using the browser FaceDetector API and set object-position to center the face
async function cropImageToFace(img) {
  if (!('FaceDetector' in window)) {
    // not supported
    return Promise.reject(new Error('FaceDetector not available'));
  }
  try {
    // create an ImageBitmap for more reliable detection if available
    let bitmap;
    if ('createImageBitmap' in window) {
      bitmap = await createImageBitmap(img);
    } else {
      bitmap = img;
    }
    const detector = new FaceDetector({ maxDetectedFaces: 1 });
    const faces = await detector.detect(bitmap);
    if (!faces || faces.length === 0) return Promise.reject(new Error('No faces'));
    const box = faces[0].boundingBox; // {x, y, width, height}
    // compute center of face relative to natural image size
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    if (!natW || !natH) return Promise.reject(new Error('Invalid image size'));
    const centerX = ((box.x + box.width / 2) / natW) * 100;
    const centerY = ((box.y + box.height / 2) / natH) * 100;
    // clamp
    const clamp = (v) => Math.max(0, Math.min(100, v));
    img.style.objectPosition = `${clamp(centerX)}% ${clamp(centerY)}%`;
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}
