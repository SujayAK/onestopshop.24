const HERO_SLIDES = [
  {
    title: 'One Stop Shop',
    subtitle: 'Curated by women for women.',
    ctaHref: '#/shop',
    imageDesktop: '/banner/25555%20logo.png',
    imageMobile: '/banner/WS%20Mobile%20(1600%20x%20900%20px).png'
  },
  {
    title: 'One Stop Shop',
    subtitle: 'Curated by women for women.',
    ctaHref: '#/shop',
    imageDesktop: '/banner/WS%20Mobile%20(1600%20x%20900%20px).png',
    imageMobile: '/banner/WS%20Mobile%20(1600%20x%20900%20px).png'
  },
  {
    title: 'One Stop Shop',
    subtitle: 'Curated bags and accessories for everyday elegance.',
    ctaHref: '#/shop',
    imageDesktop: '/banner/website-banner-1.webp',
    imageMobile: '/banner/website-banner-1.webp'
  },
  {
    title: 'One Stop Shop',
    subtitle: 'Curated bags and accessories for everyday elegance.',
    ctaHref: '#/shop',
    imageDesktop: '/banner/website-banner-2.webp',
    imageMobile: '/banner/website-banner-2.webp'
  }
];

const COLLECTION_COLUMNS = [
  {
    title: 'Bags',
    description: 'Signature styles and everyday carry pieces.',
    autoplayClass: 'is-left',
    items: [
      { alt: 'Bag Image 1619', src: '/slideshow/IMG_1619-full.webp', href: '#/shop?cat=Bags' },
      { alt: 'Bag Image 1620', src: '/slideshow/IMG_1620-full.webp', href: '#/shop?cat=Bags' },
      { alt: 'Bag Image 1626', src: '/slideshow/IMG_1626-full.webp', href: '#/shop?cat=Bags' }
    ]
  },
  {
    title: 'Accessories',
    description: 'Finishing touches for polished everyday looks.',
    autoplayClass: 'is-right',
    items: [
      { alt: 'Accessories Image 1621', src: '/slideshow/IMG_1621-full.webp', href: '#/shop?cat=Accessories' },
      { alt: 'Accessories Image 1622', src: '/slideshow/IMG_1622-full.webp', href: '#/shop?cat=Accessories' },
      { alt: 'Accessories Image 1623', src: '/slideshow/IMG_1623-full.webp', href: '#/shop?cat=Accessories' },
      { alt: 'Accessories Image 1625', src: '/slideshow/IMG_1625-full.webp', href: '#/shop?cat=Accessories' }
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
                height="900"
                decoding="async"
                fetchpriority="high"
                loading="eager"
              >
            </picture>
          </div>
        `).join('')}
      </div>

      <button type="button" class="home-hero-arrow prev" id="home-hero-prev" aria-label="Previous banner">
        <span aria-hidden="true">&#8249;</span>
      </button>

      <div class="home-hero-controls" aria-label="Banner controls">
        <div class="home-hero-dots" role="tablist" aria-label="Select banner">
          ${HERO_SLIDES.map((_, index) => `
            <button
              type="button"
              class="home-hero-dot${index === 0 ? ' is-active' : ''}"
              data-hero-dot="${index}"
              role="tab"
              aria-label="Go to banner ${index + 1}"
              aria-selected="${index === 0 ? 'true' : 'false'}"
            ></button>
          `).join('')}
        </div>
      </div>

      <button type="button" class="home-hero-arrow next" id="home-hero-next" aria-label="Next banner">
        <span aria-hidden="true">&#8250;</span>
      </button>
    </section>

    <section class="home-collections section" aria-label="Bags and accessories collections">
      <div class="container">
        <div class="home-collections-grid">
          ${COLLECTION_COLUMNS.map(column => `
            <article class="home-collection-card ${column.autoplayClass}">
              <div class="home-collection-header">
                <h2>${escapeHtml(column.title)}</h2>
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
  const prev = document.getElementById('home-hero-prev');
  const next = document.getElementById('home-hero-next');

  if (!slides.length || !prev || !next) {
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
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === index);
      dot.setAttribute('aria-selected', dotIndex === index ? 'true' : 'false');
    });
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