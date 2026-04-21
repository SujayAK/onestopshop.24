import { getProductsCatalogAdvanced } from '../utils/cloudflare.js';

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
      { alt: 'Rhinestone Bag', src: '/Website%20Banners.webp', bagTarget: 'rhinestone-bag', href: '#/shop?cat=Bags' },
      { alt: 'Office Bag', src: '/Website%20Banners.webp', bagTarget: 'office-bag', href: '#/shop?cat=Bags' },
      { alt: 'Stunner', src: '/Website%20Banners.webp', bagTarget: 'stunner', href: '#/shop?cat=Bags' },
      { alt: 'Cloud Tote', src: '/Website%20Banners.webp', bagTarget: 'cloud-tote', href: '#/shop?cat=Bags' }
    ]
  },
  {
    title: 'Accessories',
    description: 'Finishing touches for polished everyday looks.',
    autoplayClass: 'is-right',
    items: [
      { alt: 'img', src: '/Website%20Banners.webp', href: '#/shop?cat=Accessories' },
      { alt: 'img2', src: '/Website%20Banners.webp', href: '#/shop?cat=Accessories' },
      { alt: 'img3', src: '/Website%20Banners.webp', href: '#/shop?cat=Accessories' },
      { alt: 'img4', src: '/Website%20Banners.webp', href: '#/shop?cat=Accessories' }
    ]
  }
];

const HOME_ABOUT_PREVIEW = {
  title: 'About OneStop',
  copy: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer volutpat, nibh non interdum tincidunt, mauris turpis mattis augue, et posuere lectus est a justo. Sed vel justo non risus interdum feugiat at in urna. Donec in mi sapien. Integer malesuada dolor vel sem fermentum, at feugiat tellus vulputate.',
  image: '/about%20us.webp'
};

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
                    <a class="home-collection-slide" href="${item.href || '#/shop'}" aria-label="View ${escapeHtml(item.alt)} details" aria-hidden="${index >= column.items.length ? 'true' : 'false'}">
                      <img
                        src="${item.src}"
                        alt="${escapeHtml(item.alt)}"
                        ${item.bagTarget ? `data-bag-target="${escapeHtml(item.bagTarget)}"` : ''}
                        loading="lazy"
                        decoding="async"
                      >
                    </a>
                  `).join('')}
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="home-about-preview section" aria-label="About OneStop preview">
      <div class="container">
        <article class="home-about-preview-card">
          <div class="home-about-preview-media">
            <img src="${HOME_ABOUT_PREVIEW.image}" alt="About OneStop" loading="lazy" decoding="async">
          </div>
          <div class="home-about-preview-copy">
            <p class="home-about-preview-kicker">About Us</p>
            <h2>${escapeHtml(HOME_ABOUT_PREVIEW.title)}</h2>
            <p>${escapeHtml(HOME_ABOUT_PREVIEW.copy)}</p>
            <a href="#/about" class="btn btn-outline home-about-preview-link">Read more...</a>
          </div>
        </article>
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

const BAG_IMAGE_TARGETS = [
  { key: 'rhinestone-bag', terms: ['rhinestone bag', 'rhinestone'] },
  { key: 'office-bag', terms: ['office bag', 'office'] },
  { key: 'stunner', terms: ['stunner'] },
  { key: 'cloud-tote', terms: ['cloud tote', 'cloud', 'tote'] }
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveBagImageMap(products = []) {
  const normalizedProducts = (Array.isArray(products) ? products : [])
    .map(product => ({
      name: normalizeText(product?.name),
      image: String(product?.image || product?.image_url || '').trim()
    }))
    .filter(product => product.name && product.image);

  return BAG_IMAGE_TARGETS.reduce((map, target) => {
    const match = normalizedProducts.find(product => target.terms.some(term => product.name.includes(term)));
    if (match) {
      map.set(target.key, match.image);
    }
    return map;
  }, new Map());
}

async function initHomeBagCollectionImages() {
  const bagImages = document.querySelectorAll('.home-collection-card.is-left img[data-bag-target]');
  if (!bagImages.length) {
    return;
  }

  const result = await getProductsCatalogAdvanced({
    category: 'Bags',
    limit: 120,
    sort: 'featured-first',
    prioritizeDisplayOrder: true,
    onlyActive: true
  });

  if (!result?.success || !Array.isArray(result.data) || result.data.length === 0) {
    return;
  }

  const imageMap = resolveBagImageMap(result.data);
  if (imageMap.size === 0) {
    return;
  }

  bagImages.forEach(image => {
    const target = String(image.getAttribute('data-bag-target') || '').trim();
    const source = imageMap.get(target);
    if (!source) {
      return;
    }
    image.src = source;

    const tile = image.closest('.home-collection-slide');
    const matchedProduct = (Array.from(result.data || [])).find(product => {
      const normalizedName = normalizeText(product?.name);
      return BAG_IMAGE_TARGETS.find(targetConfig => targetConfig.key === target)?.terms.some(term => normalizedName.includes(term));
    });

    if (tile && matchedProduct?.id) {
      tile.setAttribute('href', `#/product/${encodeURIComponent(String(matchedProduct.id).trim())}`);
    }
  });
}

export async function initHomePage() {
  initHomeHeroSlides();
  await initHomeBagCollectionImages();
}