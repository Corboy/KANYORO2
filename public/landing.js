const headingElement = document.getElementById('animatedHeading');
if (headingElement) {
  headingElement.style.color = '#D4AF37';
  headingElement.style.textShadow = '0 0 30px rgba(212, 175, 55, 0.3), 0 0 60px rgba(212, 175, 55, 0.15)';
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

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) { overlay.remove(); return; }

  const alreadyPlayed = localStorage.getItem('introPlayed') === 'true';
  if (alreadyPlayed) { overlay.remove(); return; }

  const logoImg = overlay.querySelector('.welcome-logo img');
  const tagline = overlay.querySelector('.welcome-tagline');
  const small = overlay.querySelector('.welcome-logo small');
  const skipBtn = overlay.querySelector('#skipIntro') || overlay.querySelector('.skip-intro');

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    overlay.classList.add('welcome-overlay-hide');
    overlay.setAttribute('aria-hidden', 'true');
    try { localStorage.setItem('introPlayed', 'true'); } catch (e) {}
    overlay.addEventListener('animationend', () => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
  };

  if (skipBtn) skipBtn.addEventListener('click', finish);

  // prepare initial states
  if (logoImg) {
    logoImg.style.opacity = '0';
    logoImg.style.transform = 'scale(0.84) translateY(8px)';
  }
  if (tagline) {
    // keep text for typing; we'll overwrite it during typing
    tagline._fullText = (tagline.textContent || '').trim();
    tagline.textContent = '';
    tagline.style.opacity = '0';
  }
  if (small) small.style.opacity = '0';

  // helper: play logo pop (resolves when animation ends or after fallback timeout)
  const playLogo = () => {
    if (!logoImg) return Promise.resolve();
    return new Promise(resolve => {
      const onEnd = (e) => {
        logoImg.removeEventListener('animationend', onEnd);
        resolve();
      };
      logoImg.addEventListener('animationend', onEnd);
      // trigger CSS animation
      logoImg.classList.add('welcome-logo-animate');
      // fallback: resolve after 900ms in case animationend doesn't fire
      setTimeout(resolve, 900);
    });
  };

  // typed tagline (returns a promise)
  const typeTagline = () => {
    if (!tagline) return Promise.resolve();
    return new Promise(resolve => {
      const fullText = tagline._fullText || '';
      let idx = 0;
      const typeDelay = 30;

      function step() {
        if (idx <= fullText.length) {
          tagline.textContent = fullText.slice(0, idx);
          idx++;
          tagline.style.opacity = '1';
          setTimeout(step, typeDelay + Math.random() * 20);
        } else {
          if (small) try { small.classList.add('welcome-subtle-animate'); } catch (e) {}
          if (window.innerWidth > 768 && !prefersReduced) { try { fireConfetti(); } catch (e) {} }
          // short pause for reading
          setTimeout(resolve, 900);
        }
      }

      // small delay before typing to let logo settle
      setTimeout(step, 220);
    });
  };

  // run sequence: logo pop -> type tagline -> finish
  playLogo().then(() => typeTagline()).then(() => finish());
}

window.addEventListener('load', () => {
  // If user prefers reduced motion, don't delay or show the overlay
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    const ov = document.getElementById('welcomeOverlay');
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    return;
  }

  // Wait 5 seconds, then reveal the overlay and start the animation sequence.
  setTimeout(() => {
    const overlay = document.getElementById('welcomeOverlay');
    if (!overlay) return;
    // add visible class so CSS can transition it in
    overlay.classList.add('welcome-overlay-visible');
    // start the existing animation flow
    playWelcomeAnimation();
  }, 5000);
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

// Assign staff photos deterministically from randomuser.me based on name+gender
function assignStaffPhotos() {
  const staffCards = document.querySelectorAll('.experienced-staff .staff-card');
  if (!staffCards || staffCards.length === 0) return;

  staffCards.forEach(card => {
    // prefer data attributes if provided
    const name = card.getAttribute('data-name') || (card.querySelector('h3') && card.querySelector('h3').textContent.trim()) || 'user';
    const genderAttr = (card.getAttribute('data-gender') || '').toLowerCase();
    const gender = (genderAttr === 'female' || genderAttr === 'woman' || genderAttr === 'women') ? 'women' : 'men';

    // deterministic hash from name -> number 0-99
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0; // convert to 32bit int
    }
    const idx = Math.abs(hash) % 100; // randomuser has 0-99 portraits

    // Prefer Unsplash search for Black portraits (gender-aware). Use sig to keep selection deterministic per name.
    // Fallback to randomuser.me if Unsplash fails to load.
    const genderQuery = (gender === 'women') ? 'woman' : 'man';
    const unsplashSrc = `https://source.unsplash.com/600x600/?black+person,portrait,${encodeURIComponent(genderQuery)}&sig=${idx}`;

    const imageWrap = card.querySelector('.staff-image');
    if (imageWrap) {
      // remove existing initials if present
      imageWrap.innerHTML = '';
      const img = document.createElement('img');
      img.alt = `${name} — team member`;
      img.loading = 'lazy';
      // try Unsplash first
      img.src = unsplashSrc;
      // if Unsplash returns a 404 or blocked, try randomuser as fallback
      img.addEventListener('error', () => {
        try {
          img.src = `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
        } catch (e) {
          // final fallback: use a generated avatar (DiceBear)
          img.src = `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(name)}`;
        }
      });
  imageWrap.appendChild(img);

      // make image clickable to open WhatsApp with a prefilled message for that person
      const phone = '+255763542024';
      const message = `Hello ${name}, I'm interested in professional services.`;
      const openWhatsapp = () => {
        const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      };
      imageWrap.style.cursor = 'pointer';
      imageWrap.setAttribute('role', 'button');
      imageWrap.setAttribute('tabindex', '0');
      imageWrap.setAttribute('aria-label', `Contact ${name} on WhatsApp`);

      // Attempt to prefetch and use blob URL to improve reliability and caching
      (async function prefetch() {
        try {
          const resp = await fetch(img.src, { mode: 'cors', cache: 'force-cache' });
          if (!resp.ok) throw new Error('prefetch-failed');
          const blob = await resp.blob();
          const objectUrl = URL.createObjectURL(blob);
          img.src = objectUrl;
        } catch (e) {
          // ignore and fall back to original src (browser will handle caching)
        }
      })();
      imageWrap.addEventListener('click', openWhatsapp);
      imageWrap.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { openWhatsapp(); } });
    }
  });
}

// Personalize leadership team WhatsApp buttons: set message with name & role before opening
function personalizeLeadershipButtons() {
  document.querySelectorAll('.team-card .whatsapp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.team-card');
      const name = (card && card.dataset.name) ? card.dataset.name : (card && card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : 'Team Member');
      const role = (card && card.dataset.role) ? card.dataset.role : (card && card.querySelector('.team-role') ? card.querySelector('.team-role').textContent.trim() : '');
      const phone = '255763542024';
      const text = `Hello ${name}${role ? ' — ' + role : ''}, I would like to enquire about professional services.`;
      // set href to include prefilled message
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

  // Use a configurable endpoint. Set window.FORMSPREE_ENDPOINT in HTML or
  // set a Netlify env var and inject it into the page during build if desired.
  const endpoint = (window && window.FORMSPREE_ENDPOINT) ? window.FORMSPREE_ENDPOINT : 'https://formspree.io/f/YOUR_FORMSPREE_ID';

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
  setTimeout(assignStaffPhotos, 200);
  // personalize leadership WhatsApp button messages
  setTimeout(personalizeLeadershipButtons, 300);
  // try to insert provided local photo for John Kanyoro and crop to face
  setTimeout(assignJohnPhoto, 350);
  // initialize enhanced staff UI (search, filters, modal)
  setTimeout(initializeStaffUI, 400);
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

  // keyboard shortcut: press 'f' to focus the staff search (unless typing already)
  document.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName && e.target.tagName.toLowerCase();
    if (e.key === 'f' && tag !== 'input' && tag !== 'textarea') {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }
  });

  // sorting
  const sortSelect = document.getElementById('staffSort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const val = sortSelect.value || 'name';
      const cards = Array.from(staffGrid.querySelectorAll('.staff-card'));
      cards.sort((a,b) => {
        if (val === 'name') {
          return (a.dataset.name || a.querySelector('h3').textContent).localeCompare(b.dataset.name || b.querySelector('h3').textContent);
        } else if (val === 'role') {
          const ra = (a.querySelector('.staff-position') && a.querySelector('.staff-position').textContent) || '';
          const rb = (b.querySelector('.staff-position') && b.querySelector('.staff-position').textContent) || '';
          return ra.localeCompare(rb);
        } else if (val === 'tags') {
          const ta = (a.dataset.tags||''); const tb = (b.dataset.tags||'');
          return ta.localeCompare(tb);
        }
        return 0;
      });
      // re-append in order
      cards.forEach(c => staffGrid.appendChild(c));
    });
  }

  // Export staff list to CSV
  const exportBtn = document.getElementById('exportStaffCsv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const rows = [['Name','Role','Tags','Bio']];
      document.querySelectorAll('.experienced-staff .staff-card').forEach(card => {
        const name = card.dataset.name || (card.querySelector('h3') && card.querySelector('h3').textContent) || '';
        const role = card.querySelector('.staff-position') ? card.querySelector('.staff-position').textContent : '';
        const tags = card.dataset.tags || '';
        const bio = card.querySelector('.staff-bio') ? card.querySelector('.staff-bio').textContent.replace(/\n/g,' ') : '';
        rows.push([name, role, tags, bio]);
      });
      const csv = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g,'""') + '"').join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'staff-list.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
  }

  // Read-more toggles for long bios
  document.querySelectorAll('.staff-bio').forEach(p => {
    const txt = p.textContent.trim();
    const limit = 140;
    if (txt.length > limit) {
      const short = txt.slice(0, limit).trim() + '…';
      p.dataset.full = txt;
      p.textContent = short;
      p.classList.add('truncated');
      const moreBtn = document.createElement('button');
      moreBtn.className = 'read-more'; moreBtn.type = 'button'; moreBtn.textContent = 'Read more';
      moreBtn.addEventListener('click', () => {
        if (moreBtn.textContent === 'Read more') {
          p.textContent = p.dataset.full; moreBtn.textContent = 'Show less'; p.classList.remove('truncated');
        } else { p.textContent = p.dataset.full.slice(0, limit).trim() + '…'; moreBtn.textContent = 'Read more'; p.classList.add('truncated'); }
      });
      p.parentNode.insertBefore(moreBtn, p.nextSibling);
    }
  });

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
