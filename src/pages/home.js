const HERO_SLIDES = [
  {
    title: 'One Stop Shop',
    subtitle: 'Curated bags and accessories for everyday elegance.',
    ctaHref: '#/shop',
    image: '/Website%20Banners.webp'
  }
];

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}


export function HomePage() {
  return `
    <section class="home-hero" aria-label="Hero slider">
      <div class="home-hero-slides" id="home-hero-slides">
        ${HERO_SLIDES.map((slide, index) => `
          <div class="home-hero-slide${index === 0 ? ' is-active' : ''}" data-hero-index="${index}" style="--hero-image:url('${slide.image}')"></div>
        `).join('')}
      </div>
      <div class="home-hero-overlay"></div>
      <div class="container home-hero-content" id="home-hero-content">
        <p class="home-hero-kicker">New Season Edit</p>
        <h1 id="home-hero-title">${escapeHtml(HERO_SLIDES[0].title)}</h1>
        <p id="home-hero-subtitle">${escapeHtml(HERO_SLIDES[0].subtitle)}</p>
        <a href="${HERO_SLIDES[0].ctaHref}" id="home-hero-cta" class="btn home-hero-cta">Shop Now</a>
      </div>
      <button type="button" class="home-hero-arrow prev" id="home-hero-prev" aria-label="Previous slide"><i class="fas fa-chevron-left"></i></button>
      <button type="button" class="home-hero-arrow next" id="home-hero-next" aria-label="Next slide"><i class="fas fa-chevron-right"></i></button>
      <div class="home-hero-dots" id="home-hero-dots">
        ${HERO_SLIDES.map((_, index) => `<button type="button" class="home-hero-dot${index === 0 ? ' is-active' : ''}" data-hero-dot="${index}" aria-label="Slide ${index + 1}"></button>`).join('')}
      </div>
    </section>
  `;
}

function initHomeHeroSlides() {
  const slides = Array.from(document.querySelectorAll('.home-hero-slide'));
  const dots = Array.from(document.querySelectorAll('.home-hero-dot'));
  const title = document.getElementById('home-hero-title');
  const subtitle = document.getElementById('home-hero-subtitle');
  const cta = document.getElementById('home-hero-cta');
  const prev = document.getElementById('home-hero-prev');
  const next = document.getElementById('home-hero-next');

  if (!slides.length || !title || !subtitle || !cta || !prev || !next) {
    return;
  }

  let activeIndex = 0;

  const render = index => {
    const slide = HERO_SLIDES[index];
    if (!slide) {
      return;
    }

    activeIndex = index;
    slides.forEach((node, nodeIndex) => node.classList.toggle('is-active', nodeIndex === index));
    dots.forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === index));
    title.textContent = slide.title;
    subtitle.textContent = slide.subtitle;
    cta.setAttribute('href', slide.ctaHref);
  };

  const goNext = step => {
    const nextIndex = (activeIndex + step + HERO_SLIDES.length) % HERO_SLIDES.length;
    render(nextIndex);
  };

  prev.addEventListener('click', () => {
    goNext(-1);
  });

  next.addEventListener('click', () => {
    goNext(1);
  });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const index = Number(dot.getAttribute('data-hero-dot'));
      if (Number.isFinite(index)) {
        render(index);
      }
    });
  });
}

export async function initHomePage() {
  initHomeHeroSlides();
}