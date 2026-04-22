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
      { alt: 'Bags Collection Banner', src: '/Website%20Banners.webp', href: '#/shop?cat=Bags' },
      { alt: 'Featured Bags', src: '/banner1.webp', href: '#/shop?cat=Bags' },
      { alt: 'Bag Styling', src: '/about%20us.webp', href: '#/shop?cat=Bags' }
    ]
  },
  {
    title: 'Accessories',
    description: 'Finishing touches for polished everyday looks.',
    autoplayClass: 'is-right',
    items: [
      { alt: 'Accessories Collection Banner', src: '/about%20us.webp', href: '#/shop?cat=Accessories' },
      { alt: 'Featured Accessories', src: '/Website%20Banners.webp', href: '#/shop?cat=Accessories' },
      { alt: 'Accessory Styling', src: '/banner1.webp', href: '#/shop?cat=Accessories' }
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
              <div class="home-collection-slideshow" aria-label="${escapeHtml(column.title)} image slider" data-collection-slideshow="${escapeHtml(column.title.toLowerCase())}">
                ${column.items.map((item, index) => `
                  <a class="home-collection-slide${index === 0 ? ' is-active' : ''}" href="${item.href || '#/shop'}" aria-label="View ${escapeHtml(item.alt)} details" data-collection-slide-index="${index}">
                    <img
                      src="${item.src}"
                      alt="${escapeHtml(item.alt)}"
                      loading="lazy"
                      decoding="async"
                    >
                  </a>
                `).join('')}
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

const COLLECTION_SLIDE_INTERVAL_MS = 3600;
const collectionSlideIntervals = [];

function clearCollectionIntervals() {
  while (collectionSlideIntervals.length) {
    const id = collectionSlideIntervals.pop();
    window.clearInterval(id);
  }
}

function initHomeCollectionSlides() {
  clearCollectionIntervals();

  const sliders = Array.from(document.querySelectorAll('[data-collection-slideshow]'));
  sliders.forEach(slider => {
    const slides = Array.from(slider.querySelectorAll('.home-collection-slide'));
    if (slides.length <= 1) {
      return;
    }

    let activeIndex = 0;
    const showSlide = index => {
      slides.forEach((slide, slideIndex) => slide.classList.toggle('is-active', slideIndex === index));
    };

    const intervalId = window.setInterval(() => {
      activeIndex = (activeIndex + 1) % slides.length;
      showSlide(activeIndex);
    }, COLLECTION_SLIDE_INTERVAL_MS);

    collectionSlideIntervals.push(intervalId);
  });
}

export function initHomePage() {
  initHomeHeroSlides();
  initHomeCollectionSlides();
}