import { getProductsCatalog, cloudflareConfig, getUserWishlist, toggleWishlistProductSync } from '../utils/cloudflare.js';
import { getProductImageAttrs, initLazyLoading, toThumbnailUrl } from '../utils/image-optimization.js';

const HERO_SLIDES = [
  {
    title: 'The Season of Signature Bags',
    subtitle: 'Premium silhouettes for workdays, travel days, and every in-between moment.',
    ctaHref: '#/shop?cat=Bags',
    image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=2000&auto=format&fit=crop'
  },
  {
    title: 'Accessories That Finish The Look',
    subtitle: 'Layered details, modern accents, and effortless gifting picks.',
    ctaHref: '#/shop?cat=Accessories',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=2000&auto=format&fit=crop'
  },
  {
    title: 'New Launches Every Week',
    subtitle: 'Fresh drops with elevated textures and timeless color stories.',
    ctaHref: '#/shop',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1600&auto=format&fit=crop'
  }
];

const CATEGORY_FALLBACK = [
  {
    name: 'Bags',
    href: '#/shop?cat=Bags',
    image: 'https://placehold.co/900x1100/f3f4f6/111111?text=Add+Bags+Image'
  },
  {
    name: 'Accessories',
    href: '#/shop?cat=Accessories',
    image: 'https://placehold.co/900x1100/f3f4f6/111111?text=Add+Accessories+Image'
  }
];

let heroSlideTimer = null;

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseJsonValue(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normalizeProduct(row) {
  const id = String(row.id ?? '').trim();
  return {
    id,
    name: row.name || 'Product',
    price: Number(row.price || 0),
    category: row.category || 'General',
    subcategory: row.subcategory || '',
    image: row.image || row.image_url || 'https://placehold.co/800x1000?text=Product',
    description: row.description || '',
    stock: Number.isFinite(Number(row.stock)) ? Number(row.stock) : null,
    variants: parseJsonValue(row.variants || row.media_json || row.media_gallery, []),
    colors: parseJsonValue(row.colors, [])
  };
}

function getProductColors(product) {
  const explicit = Array.isArray(product.colors) ? product.colors : [];
  if (explicit.length > 0) {
    return explicit.map(item => ({
      name: typeof item === 'string' ? item : item.name || item.hex || 'Color',
      hex: typeof item === 'string' ? item : item.hex || '#d9c7d2'
    }));
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants
    .map(variant => ({
      name: variant.color || variant.name || 'Color',
      hex: variant.hex || '#d9c7d2'
    }))
    .filter(color => color.name);
}

function getProductImagePair(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const firstVariant = variants[0] || null;
  const views = parseJsonValue(firstVariant?.views || firstVariant?.images || firstVariant?.gallery, []);
  const normalizedViews = Array.isArray(views) ? views : [];

  const primaryUrl = normalizedViews[0]?.url || normalizedViews[0]?.image_url || normalizedViews[0]?.image || product.image;
  const hoverUrl = normalizedViews.find(view => {
    const label = String(view.label || view.name || view.view || view.angle || '').toLowerCase();
    const url = view.url || view.image_url || view.image;
    return url && /side|detail|lifestyle|back|angle|inside/.test(label);
  })?.url || normalizedViews[1]?.url || normalizedViews[1]?.image_url || product.image;

  return {
    primary: primaryUrl || product.image,
    secondary: hoverUrl || primaryUrl || product.image,
    hasHover: Boolean(hoverUrl && hoverUrl !== primaryUrl)
  };
}

function formatINR(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function renderCategoryCards(products = []) {
  const categories = CATEGORY_FALLBACK.map(item => ({ ...item }));

  if (Array.isArray(products) && products.length > 0) {
    const bagProduct = products.find(product => String(product.category || '').toLowerCase() === 'bags');
    const accessoryProduct = products.find(product => String(product.category || '').toLowerCase() === 'accessories');

    if (bagProduct?.image) {
      categories[0].image = bagProduct.image;
    }

    if (accessoryProduct?.image) {
      categories[1].image = accessoryProduct.image;
    }
  }

  return categories.map(item => `
    <a href="${item.href}" class="home-category-card">
      <span class="home-category-media"><img src="${item.image}" alt="${escapeHtml(item.name)}"></span>
      <span class="home-category-name">${escapeHtml(item.name)}</span>
    </a>
  `).join('');
}

function renderHomeProductCard(product, wished = false) {
  const imagePair = getProductImagePair(product);
  const primary = getProductImageAttrs(toThumbnailUrl(imagePair.primary), {
    desktopWidth: 900,
    sizes: '(max-width: 640px) 70vw, (max-width: 980px) 40vw, 24vw',
    aspectRatio: '4:5'
  });
  const secondary = getProductImageAttrs(toThumbnailUrl(imagePair.secondary), {
    desktopWidth: 900,
    sizes: '(max-width: 640px) 70vw, (max-width: 980px) 40vw, 24vw',
    aspectRatio: '4:5'
  });
  const swatches = getProductColors(product).slice(0, 5);

  return `
    <article class="home-product-card" data-product-id="${product.id}">
      <a href="#/product/${product.id}" class="home-product-media${imagePair.hasHover ? ' has-hover' : ''}">
        <img
          class="lazy-image home-product-image primary"
          src="${primary.placeholder}"
          data-src="${primary.src}"
          data-srcset="${primary.srcset}"
          sizes="${primary.sizes}"
          width="800"
          height="1000"
          alt="${escapeHtml(product.name)}"
          loading="lazy"
          decoding="async"
        >
        ${imagePair.hasHover ? `
          <img
            class="home-product-image secondary"
            src="${secondary.src}"
            srcset="${secondary.srcset}"
            sizes="${secondary.sizes}"
            width="800"
            height="1000"
            alt="${escapeHtml(product.name)} alternate image"
            loading="lazy"
            decoding="async"
          >
        ` : ''}
      </a>
      <button type="button" class="home-wishlist-btn${wished ? ' is-active' : ''}" data-home-wishlist="${product.id}" aria-label="Toggle wishlist">
        <i class="${wished ? 'fas' : 'far'} fa-heart"></i>
      </button>
      <div class="home-product-meta">
        <h3><a href="#/product/${product.id}">${escapeHtml(product.name)}</a></h3>
        <p class="home-product-price">${formatINR(product.price)}</p>
        <div class="home-product-swatches">
          ${swatches.map(swatch => `<span style="--swatch:${escapeHtml(swatch.hex)}" title="${escapeHtml(swatch.name)}"></span>`).join('')}
        </div>
      </div>
    </article>
  `;
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

    <section class="section home-section">
      <div class="container">
        <div class="home-section-head centered">
          <h2>SHOP BY CATEGORY</h2>
        </div>
        <div class="home-category-grid" id="home-category-grid">
          <div class="profile-loading" style="grid-column: 1 / -1;">Loading categories...</div>
        </div>
      </div>
    </section>

    <section class="section home-section home-section-alt">
      <div class="container">
        <div class="home-section-head">
          <h2>NEW ARRIVALS</h2>
          <a href="#/shop" class="home-view-all">View All</a>
        </div>
        <div class="home-products-carousel" id="home-new-arrivals-track">
          <div class="profile-loading">Loading new arrivals...</div>
        </div>
      </div>
    </section>

    <section class="section home-section">
      <div class="container">
        <div class="home-section-head">
          <h2>BEST SELLERS</h2>
        </div>
        <div class="home-best-grid" id="home-best-sellers-grid">
          <div class="profile-loading" style="grid-column: 1 / -1;">Loading best sellers...</div>
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

  const startAuto = () => {
    if (heroSlideTimer) {
      clearInterval(heroSlideTimer);
    }
    heroSlideTimer = setInterval(() => {
      if (!document.body.contains(title)) {
        clearInterval(heroSlideTimer);
        heroSlideTimer = null;
        return;
      }
      goNext(1);
    }, 4800);
  };

  prev.addEventListener('click', () => {
    goNext(-1);
    startAuto();
  });

  next.addEventListener('click', () => {
    goNext(1);
    startAuto();
  });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const index = Number(dot.getAttribute('data-hero-dot'));
      if (Number.isFinite(index)) {
        render(index);
        startAuto();
      }
    });
  });

  startAuto();
}

function bindHomeWishlistButtons(wishlistIds, allProducts) {
  document.querySelectorAll('[data-home-wishlist]').forEach(button => {
    const productId = String(button.getAttribute('data-home-wishlist') || '').trim();
    button.classList.toggle('is-active', wishlistIds.has(productId));
    const icon = button.querySelector('i');
    if (icon) {
      icon.className = `${wishlistIds.has(productId) ? 'fas' : 'far'} fa-heart`;
    }

    if (button.dataset.bound === 'true') {
      return;
    }

    button.addEventListener('click', async () => {
      const result = await toggleWishlistProductSync(productId);
      if (!result.success) {
        if (result.error === 'Please login first') {
          alert('Please login to add items to your wishlist');
        }
        return;
      }

      if (result.active) {
        wishlistIds.add(productId);
      } else {
        wishlistIds.delete(productId);
      }

      document.querySelectorAll(`[data-home-wishlist="${productId}"]`).forEach(node => {
        node.classList.toggle('is-active', wishlistIds.has(productId));
        const nodeIcon = node.querySelector('i');
        if (nodeIcon) {
          nodeIcon.className = `${wishlistIds.has(productId) ? 'fas' : 'far'} fa-heart`;
        }
      });
    });

    button.dataset.bound = 'true';
  });

  window.dispatchEvent(new CustomEvent('catalogHydrated', { detail: { products: allProducts } }));
}

export async function initHomePage() {
  initHomeHeroSlides();

  const categoryGrid = document.getElementById('home-category-grid');
  const newArrivalsTrack = document.getElementById('home-new-arrivals-track');
  const bestSellersGrid = document.getElementById('home-best-sellers-grid');

  if (!categoryGrid || !newArrivalsTrack || !bestSellersGrid) {
    return;
  }

  let products = [];
  const catalogResult = await getProductsCatalog({ limit: 36, sort: 'newest' });
  if (catalogResult.success && Array.isArray(catalogResult.data) && catalogResult.data.length > 0) {
    products = catalogResult.data.map(normalizeProduct);
  }

  if (products.length === 0) {
    categoryGrid.innerHTML = '<div class="profile-empty-state" style="grid-column: 1 / -1;"><h3>No products available</h3><p>Please check back soon.</p></div>';
    newArrivalsTrack.innerHTML = '<div class="profile-empty-state"><h3>No new arrivals yet</h3></div>';
    bestSellersGrid.innerHTML = '<div class="profile-empty-state" style="grid-column: 1 / -1;"><h3>No best sellers available</h3></div>';
    return;
  }

  const wishlistResult = await getUserWishlist();
  const wishlistIds = new Set((wishlistResult.success && Array.isArray(wishlistResult.data) ? wishlistResult.data : []).map(item => String(item).trim()).filter(Boolean));

  const newArrivals = products.slice(0, 12);
  const bestSellers = [...products]
    .sort((left, right) => Number(right.stock || 0) - Number(left.stock || 0) || Number(right.price || 0) - Number(left.price || 0))
    .slice(0, 4);

  categoryGrid.innerHTML = renderCategoryCards(products);
  newArrivalsTrack.innerHTML = newArrivals.map(product => renderHomeProductCard(product, wishlistIds.has(product.id))).join('');
  bestSellersGrid.innerHTML = bestSellers.map(product => renderHomeProductCard(product, wishlistIds.has(product.id))).join('');

  initLazyLoading();
  bindHomeWishlistButtons(wishlistIds, products);
}