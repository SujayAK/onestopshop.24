const HERO_SLIDES = [
  {
    title: 'One Stop Shop',
    subtitle: 'Curated bags and accessories for everyday elegance.',
    ctaHref: '#/shop',
    imageDesktop: '/Website%20Banners.webp',
    imageMobile: '/Website%20Banners.webp'
  }
];

const COLLECTION_COLUMNS = [
  {
    title: 'Bags',
    description: 'Signature styles and everyday carry pieces.',
    autoplayClass: 'is-left',
    items: [
      { alt: 'img', src: '/Website%20Banners.webp' },
      { alt: 'img2', src: '/Website%20Banners.webp' },
      { alt: 'img3', src: '/Website%20Banners.webp' },
      { alt: 'img4', src: '/Website%20Banners.webp' }
    ]
  },
  {
    title: 'Accessories',
    description: 'Finishing touches for polished everyday looks.',
    autoplayClass: 'is-right',
    items: [
      { alt: 'img', src: '/Website%20Banners.webp' },
      { alt: 'img2', src: '/Website%20Banners.webp' },
      { alt: 'img3', src: '/Website%20Banners.webp' },
      { alt: 'img4', src: '/Website%20Banners.webp' }
    ]
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
          <div class="home-hero-slide${index === 0 ? ' is-active' : ''}" data-hero-index="${index}">
            <picture class="home-hero-media">
              <source media="(max-width: 768px)" srcset="${slide.imageMobile || slide.imageDesktop}">
              <img
                class="home-hero-image"
                src="${slide.imageDesktop}"
                alt="${escapeHtml(slide.title)}"
                width="2400"
                height="1200"
                decoding="async"
                fetchpriority="high"
                loading="eager"
              >
            </picture>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="home-collections section" aria-label="Bags and accessories collections">
      <div class="container">
        <div class="home-collections-grid">
          ${COLLECTION_COLUMNS.map(column => `
            <article class="home-collection-card ${column.autoplayClass}">
              <div class="home-collection-header">
                <p class="home-collection-kicker">Collection</p>
                <h2>${escapeHtml(column.title)}</h2>
                <p>${escapeHtml(column.description)}</p>
              </div>
              <div class="home-collection-marquee" aria-label="${escapeHtml(column.title)} image slider">
                <div class="home-collection-track">
                  ${[...column.items, ...column.items].map((item, index) => `
                    <div class="home-collection-slide" aria-hidden="${index >= column.items.length ? 'true' : 'false'}">
                      <img
                        src="${item.src}"
                        alt="${escapeHtml(item.alt)}"
                        loading="lazy"
                        decoding="async"
                      >
                    </div>
                  `).join('')}
                </div>
              </div>
            </article>
          `).join('')}
        </div>
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