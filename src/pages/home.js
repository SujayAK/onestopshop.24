import localProducts from '../data/products.json';
import { getProductsCatalog, cloudflareConfig } from '../utils/cloudflare.js';
import { getProductImageAttrs, initLazyLoading } from '../utils/image-optimization.js';

const HERO_SLIDES = ['STOCK CLEARANCE SALE', 'PREMIUM PRODUCTS'];
let heroSlideTimer = null;

function normalizeProduct(row) {
  return {
    id: String(row.id ?? '').trim(),
    name: row.name || 'Product',
    price: Number(row.price || 0),
    category: row.category || 'General',
    image: row.image || row.image_url || 'https://via.placeholder.com/600x600?text=Product',
    description: row.description || '',
    stock: Number.isFinite(Number(row.stock)) ? Number(row.stock) : null
  };
}

function renderProductCard(product) {
  const image = getProductImageAttrs(product.image, {
    desktopWidth: 700,
    sizes: '(max-width: 640px) 46vw, (max-width: 980px) 30vw, 22vw'
  });

  return `
    <div class="shop-product-card" data-product-id="${product.id}">
      <div class="shop-card-image">
        <img
          class="lazy-image"
          src="${image.placeholder}"
          data-src="${image.src}"
          data-srcset="${image.srcset}"
          sizes="${image.sizes}"
          width="800"
          height="1000"
          alt="${product.name}"
          decoding="async"
          loading="lazy"
        >
      </div>
      <div class="shop-card-info">
        <h3 class="shop-card-title">${product.name}</h3>
        <p class="shop-card-price">₹${product.price.toFixed(2)}</p>
        <span class="shop-stock-badge is-in" data-stock-label data-product-id="${product.id}">Checking stock...</span>
        <div class="shop-card-buttons">
          <button class="btn btn-sm add-to-cart-btn" data-product-id="${product.id}" data-default-label="Add to Cart">Add to Cart</button>
          <a href="#/product/${product.id}" class="btn btn-sm btn-outline">Details</a>
        </div>
        <button class="btn btn-outline wishlist-toggle" data-product-id="${product.id}" style="margin-top: 0.7rem; width: 100%;">Add to Wishlist</button>
      </div>
    </div>
  `;
}

export function HomePage() {
  return `
    <section class="hero">
      <div class="container hero-content" style="text-align: center;">
        <div class="hero-slide-shell" aria-live="polite">
          <p class="hero-slide-kicker">Trending Now</p>
          <div class="hero-slide-nav">
            <button type="button" class="hero-slide-arrow" id="hero-slide-prev" aria-label="Previous promotion">
              <i class="fas fa-chevron-left" aria-hidden="true"></i>
            </button>
            <h1 id="hero-slide-text" class="hero-slide-text">${HERO_SLIDES[0]}</h1>
            <button type="button" class="hero-slide-arrow" id="hero-slide-next" aria-label="Next promotion">
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
          <div class="hero-slide-dots" id="hero-slide-dots" role="tablist" aria-label="Homepage promotions">
            ${HERO_SLIDES.map((_, index) => `<button class="hero-slide-dot${index === 0 ? ' is-active' : ''}" data-hero-slide="${index}" role="tab" aria-label="Show slide ${index + 1}"></button>`).join('')}
          </div>
        </div>
        <p>Discover curated collections of premium bags and accessories designed for everyday elegance and modern living.</p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <a href="#/shop" class="btn">Shop Collection</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 style="text-align: center; margin-bottom: 3rem;">Featured Categories</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
          <a href="#/shop?cat=Bags" class="category-card" style="background: url('https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800') center/cover;">
            <div class="category-content">
              <h3 style="color: white; font-size: 2rem;">Bags</h3>
              <span style="text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Explore →</span>
            </div>
          </a>
          <a href="#/shop?cat=Accessories" class="category-card" style="background: url('https://images.unsplash.com/photo-1523206489230-c012c64b2b48?q=80&w=800') center/cover;">
            <div class="category-content">
              <h3 style="color: white; font-size: 2rem;">Accessories</h3>
              <span style="text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Explore →</span>
            </div>
          </a>
        </div>
      </div>
    </section>

    <section class="section" style="background: var(--bg-primary);">
      <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3rem;">
          <div>
            <p style="color: var(--accent-pink); font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.5rem;">Our Favorites</p>
            <h2 style="margin-bottom: 0;">Best Sellers</h2>
          </div>
          <a href="#/shop" style="font-weight: 600; border-bottom: 2px solid var(--accent-pink);">View All Products</a>
        </div>
        <div id="home-featured-grid" class="shop-grid">
          <div class="profile-loading" style="grid-column: 1 / -1;">Loading featured products...</div>
        </div>
      </div>
    </section>

    <section class="section" style="background: var(--bg-secondary);">
      <div class="container" style="text-align: center;">
        <div class="home-marquee-wrap" aria-hidden="true">
          <marquee class="home-marquee" behavior="scroll" direction="left" scrollamount="6">
            &#9733; Premium Products &#9733; Durability &#9733; Add more later &#9733;
          </marquee>
        </div>
        <p style="color: var(--accent-pink); font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.5rem;">Why Choose Us</p>
        <h2>The OneStop Experience</h2>
        <div class="trust-grid">
          <div class="trust-card">
            <i class="fas fa-gem" style="font-size: 2rem; color: var(--accent-purple); margin-bottom: 1rem;"></i>
            <h4>Curated Quality</h4>
            <p>Each piece in our boutique is handpicked for its quality, durability, and timeless style.</p>
          </div>
          <div class="trust-card">
            <i class="fas fa-shield-alt" style="font-size: 2rem; color: var(--accent-purple); margin-bottom: 1rem;"></i>
            <h4>Secure Shopping</h4>
            <p>Shop with confidence. We use industry-standard encryption to protect your data.</p>
          </div>
          <div class="trust-card">
            <i class="fas fa-camera" style="font-size: 2rem; color: var(--accent-purple); margin-bottom: 1rem;"></i>
            <h4>Real Photography</h4>
            <p>What you see is what you get. We use real product photos to ensure transparency.</p>
          </div>
          <div class="trust-card">
            <i class="fab fa-instagram" style="font-size: 2rem; color: var(--accent-purple); margin-bottom: 1rem;"></i>
            <h4>Community Loved</h4>
            <p>Join thousands of happy customers who trust OneStop for their fashion needs.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="testimonial-section">
      <div class="container">
        <h2 style="text-align: center; margin-bottom: 3rem;">What Our Customers Say</h2>
        <div class="testimonial-container">
          <div class="testimonial-wrapper" id="testimonial-wrapper">
            <div class="testimonial-slide">
              <div class="testimonial-content">"Absolutely love the quality of the bags! The colors are just as vibrant as they look in the photos."</div>
              <div class="testimonial-author">- Sarah J.</div>
            </div>
            <div class="testimonial-slide">
              <div class="testimonial-content">"Fast shipping and the packaging was so cute. Definitely my new favorite shop for accessories."</div>
              <div class="testimonial-author">- Emily R.</div>
            </div>
            <div class="testimonial-slide">
              <div class="testimonial-content">"The attention to detail in every piece is amazing. Highly recommend onestopshop!"</div>
              <div class="testimonial-author">- Michelle L.</div>
            </div>
          </div>
          <div class="testimonial-dots" id="testimonial-dots">
            <span class="dot active" data-index="0"></span>
            <span class="dot" data-index="1"></span>
            <span class="dot" data-index="2"></span>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container" style="text-align: center;">
        <h2>Trusted by our Instagram community</h2>
        <p style="color: var(--text-secondary); margin-bottom: 3rem;">Tag us @onestopshop to be featured</p>
        <a href="https://www.instagram.com/onestopshop" target="_blank" class="btn btn-outline" style="margin-top: 3rem;">Follow Us on Instagram</a>
      </div>
    </section>
  `;
}

function initHomeHeroSlides() {
  const textEl = document.getElementById('hero-slide-text');
  const dotsWrap = document.getElementById('hero-slide-dots');
  const shellEl = document.querySelector('.hero-slide-shell');
  const prevBtn = document.getElementById('hero-slide-prev');
  const nextBtn = document.getElementById('hero-slide-next');
  if (!textEl || !dotsWrap || !shellEl || !prevBtn || !nextBtn) {
    return;
  }

  const dots = Array.from(dotsWrap.querySelectorAll('.hero-slide-dot'));
  let activeIndex = 0;

  const render = index => {
    textEl.classList.remove('is-visible');
    requestAnimationFrame(() => {
      textEl.textContent = HERO_SLIDES[index];
      textEl.classList.add('is-visible');
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === index);
    });
  };

  const setSlide = index => {
    activeIndex = (index + HERO_SLIDES.length) % HERO_SLIDES.length;
    render(activeIndex);
  };

  const startAuto = () => {
    if (heroSlideTimer) {
      clearInterval(heroSlideTimer);
    }

    heroSlideTimer = setInterval(() => {
      if (!document.body.contains(textEl)) {
        clearInterval(heroSlideTimer);
        heroSlideTimer = null;
        return;
      }

      setSlide(activeIndex + 1);
    }, 2600);
  };

  const stopAuto = () => {
    if (heroSlideTimer) {
      clearInterval(heroSlideTimer);
      heroSlideTimer = null;
    }
  };

  // Navigate to stock clearance on slide text click
  textEl.addEventListener('click', () => {
    if (HERO_SLIDES[activeIndex] === 'STOCK CLEARANCE SALE') {
      window.location.hash = '#/stock-clearance';
    }
  });
  textEl.style.cursor = 'pointer';

  dotsWrap.addEventListener('click', event => {
    const target = event.target.closest('[data-hero-slide]');
    if (!target) {
      return;
    }

    const index = Number(target.getAttribute('data-hero-slide'));
    if (Number.isFinite(index)) {
      setSlide(index);
    }
  });

  prevBtn.addEventListener('click', () => {
    setSlide(activeIndex - 1);
    startAuto();
  });

  nextBtn.addEventListener('click', () => {
    setSlide(activeIndex + 1);
    startAuto();
  });

  shellEl.addEventListener('mouseenter', stopAuto);
  shellEl.addEventListener('mouseleave', startAuto);
  shellEl.addEventListener('focusin', stopAuto);
  shellEl.addEventListener('focusout', startAuto);

  render(0);
  startAuto();
}

export async function initHomePage() {
  initHomeHeroSlides();

  const grid = document.getElementById('home-featured-grid');
  if (!grid) {
    return;
  }

  let featured = [];
  const catalogResult = await getProductsCatalog({ limit: 3, sort: 'newest' });
  if (catalogResult.success && (catalogResult.data || []).length > 0) {
    featured = catalogResult.data.map(normalizeProduct).slice(0, 3);
  } else if (!cloudflareConfig.apiBaseUrl) {
    featured = localProducts.slice(0, 3).map(normalizeProduct);
  } else {
    grid.innerHTML = '<div class="profile-empty-state" style="grid-column: 1 / -1;"><h3>Could not load products from backend</h3><p>Check Worker API URL, D1 data, and network logs.</p></div>';
    return;
  }

  if (featured.length === 0) {
    grid.innerHTML = '<div class="profile-empty-state" style="grid-column: 1 / -1;"><h3>No products available</h3><p>Please check back soon.</p></div>';
    return;
  }

  grid.innerHTML = featured.map(renderProductCard).join('');
  initLazyLoading();
  window.dispatchEvent(new CustomEvent('catalogHydrated', { detail: { products: featured } }));
}