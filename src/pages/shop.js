import {
  getProductsCatalogAdvanced,
  getUserWishlist,
  getUserCompare,
  toggleWishlistProductSync,
  toggleCompareProductSync,
  subscribeCatalogRealtime,
  cloudflareConfig
} from '../utils/cloudflare.js';
import { cart } from '../utils/cart.js';
import { getProductImageAttrs, initLazyLoading, toThumbnailUrl } from '../utils/image-optimization.js';
import { showAuthRequiredPopup } from '../utils/ui-popup.js';
import { INVENTORY_STRUCTURE } from '../data/inventory-structure.js';

const SHOP_CACHE_PREFIX = 'onestop.shop.catalog.cache.';
const SHOP_CACHE_TTL_MS = 8 * 60 * 1000;

function getShopCatalogCacheKey(category) {
  return `${SHOP_CACHE_PREFIX}${String(category || 'all').toLowerCase()}`;
}

function readShopCatalogCache(category) {
  const key = getShopCatalogCacheKey(category);
  const now = Date.now();

  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(key);
      if (!raw) {
        continue;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        continue;
      }
      if (now - Number(parsed.savedAt || 0) > SHOP_CACHE_TTL_MS) {
        continue;
      }
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        return parsed.products;
      }
    } catch (_error) {
      // Ignore malformed cache payloads.
    }
  }

  return [];
}

function writeShopCatalogCache(category, products) {
  if (!Array.isArray(products) || products.length === 0) {
    return;
  }

  const key = getShopCatalogCacheKey(category);
  const payload = JSON.stringify({ savedAt: Date.now(), products });

  try {
    sessionStorage.setItem(key, payload);
  } catch (_error) {
    // Ignore cache write failures.
  }

  try {
    localStorage.setItem(key, payload);
  } catch (_error) {
    // Ignore cache write failures.
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatINR(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function getProductColors(product) {
  if (!product.colors) {
    return [];
  }

  if (Array.isArray(product.colors)) {
    return product.colors.slice(0, 4).map(c => ({
      name: typeof c === 'string' ? c : c.name || c.hex || c,
      hex: typeof c === 'string' ? c : c.hex || c
    }));
  }

  try {
    const parsed = typeof product.colors === 'string' ? JSON.parse(product.colors) : product.colors;
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 4).map(c => ({
        name: typeof c === 'string' ? c : c.name || c.hex || c,
        hex: typeof c === 'string' ? c : c.hex || c
      }));
    }
  } catch (_error) {
    // ignore
  }

  return [];
}

function getStockLabel(stock) {
  const parsed = Number(stock);
  if (!Number.isFinite(parsed)) {
    return { text: 'In stock', css: 'is-in' };
  }
  if (parsed <= 0) {
    return { text: 'Out of stock', css: 'is-out' };
  }
  if (parsed <= 3) {
    return { text: `Only ${parsed} left`, css: 'is-low' };
  }
  return { text: 'In stock', css: 'is-in' };
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

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

function parseProductColors(product) {
  const source = parseJsonValue(product?.colors, []);
  const colors = Array.isArray(source) ? source : [];

  return colors.map(item => ({
    name: typeof item === 'string' ? item : item?.name || item?.hex || 'Color',
    hex: typeof item === 'string' ? item : item?.hex || '#d9c7d2'
  }));
}

function parseProductVariants(product) {
  const variants = parseJsonValue(
    product?.variants || product?.variant_images || product?.color_variants || product?.media_variants || product?.media_json || product?.media_gallery,
    []
  );

  return Array.isArray(variants) ? variants : [];
}

function extractVariantViews(variant, fallbackColorName) {
  const views = parseJsonValue(variant?.views || variant?.images || variant?.gallery, []);
  const items = Array.isArray(views) ? views : [];

  return items
    .map((view, index) => {
      const entry = typeof view === 'string' ? { url: view } : (view || {});
      const url = String(entry.url || entry.image_url || entry.image || entry.src || '').trim();
      if (!url) {
        return null;
      }

      return {
        label: normalizeText(entry.label || entry.name || entry.view || entry.angle || `View ${index + 1}`),
        url,
        alt: normalizeText(entry.alt || entry.alt_text || `${fallbackColorName} ${entry.label || `View ${index + 1}`}`)
      };
    })
    .filter(Boolean);
}

function getProductImageSet(product) {
  const variants = parseProductVariants(product);
  const colors = parseProductColors(product);

  if (variants.length > 0) {
    return variants.map((variant, index) => {
      const colorName = normalizeText(variant?.color || variant?.name || colors[index]?.name || `Color ${index + 1}`) || `Color ${index + 1}`;
      const colorHex = normalizeText(variant?.hex || colors[index]?.hex || '#d9c7d2') || '#d9c7d2';
      const views = extractVariantViews(variant, colorName);
      return {
        name: colorName,
        hex: colorHex,
        views: views.length > 0 ? views : [{ label: 'Primary', url: String(product.image_url || product.image || '').trim() }]
      };
    });
  }

  if (colors.length > 0) {
    return colors.map(color => ({
      name: color.name,
      hex: color.hex,
      views: [{ label: 'Primary', url: String(product.image_url || product.image || '').trim() }]
    }));
  }

  return [{
    name: 'Default',
    hex: '#d9c7d2',
    views: [{ label: 'Primary', url: String(product.image_url || product.image || '').trim() }]
  }];
}

function getPrimaryProductMedia(product) {
  const imageSet = getProductImageSet(product);
  const activeColor = imageSet[0] || { name: 'Default', hex: '#d9c7d2', views: [] };
  const primaryView = activeColor.views[0] || { label: 'Primary', url: product.image_url || product.image || '' };
  const hoverView = activeColor.views.find(view => view.url && view.url !== primaryView.url && /lifestyle|side|detail|back|angle/i.test(view.label))
    || activeColor.views[1]
    || primaryView;

  return {
    imageSet,
    activeColor,
    primaryView,
    hoverView
  };
}

function getProductColorsFromMedia(product) {
  const media = getProductImageSet(product);
  return media.map(item => ({ name: item.name, hex: item.hex }));
}

function deriveFilterColors(products = []) {
  const palette = new Map();

  const addColor = (name, hex) => {
    const normalizedName = normalizeText(name);
    const normalizedHex = normalizeText(hex || '#d9c7d2');
    if (!normalizedName) {
      return;
    }
    const key = normalizedName.toLowerCase();
    if (!palette.has(key)) {
      palette.set(key, { name: normalizedName, hex: normalizedHex });
    }
  };

  products.forEach(product => {
    parseProductColors(product).forEach(color => addColor(color.name, color.hex));
    const imageSet = getProductImageSet(product);
    imageSet.forEach(color => addColor(color.name, color.hex));
  });

  return [...palette.values()].slice(0, 12);
}

function normalizeCategoryLookup(value) {
  const normalized = normalizeLookup(value).replace(/[^a-z0-9]+/g, '');

  if (['bag', 'bags', 'handbag', 'handbags'].includes(normalized)) {
    return 'bags';
  }

  if (['accessory', 'accessories'].includes(normalized)) {
    return 'accessories';
  }

  return normalized;
}

function getInventoryStructureCategoryKey(category) {
  const normalized = normalizeCategoryLookup(category);
  if (normalized === 'bags') {
    return 'Bags';
  }
  if (normalized === 'accessories') {
    return 'Accessories';
  }
  return String(category || '').trim();
}

function deriveSubcategoryOptions(products = [], category = '') {
  const normalizedCategory = normalizeCategoryLookup(category);
  const scopedProducts = products.filter(product => {
    if (!normalizedCategory) {
      return true;
    }
    return normalizeCategoryLookup(product.category) === normalizedCategory;
  });

  const map = new Map();
  scopedProducts.forEach(product => {
    const subcategory = normalizeText(product.subcategory);
    if (!subcategory) {
      return;
    }

    const key = subcategory.toLowerCase();
    const entry = map.get(key) || { name: subcategory, count: 0 };
    entry.count += 1;
    map.set(key, entry);
  });

  return [...map.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function findSubcategoryBannerMatch(products = [], subcategoryName = '') {
  const target = normalizeLookup(subcategoryName);
  if (!target) {
    return null;
  }

  const byExactSubcategory = products.find(product => normalizeLookup(product.subcategory) === target);
  if (byExactSubcategory) {
    return byExactSubcategory;
  }

  const baseTarget = target.replace(/\bbags?\b/g, '').trim();
  const terms = [target, baseTarget].filter(Boolean);
  const hasTerm = (text, term) => normalizeLookup(text).includes(term);

  const byNameOrDescription = products.find(product => {
    return terms.some(term => (
      hasTerm(product.name, term)
      || hasTerm(product.description, term)
      || hasTerm(product.category, term)
    ));
  });

  return byNameOrDescription || null;
}

function buildBagsBannerItems(products = [], category = 'Bags') {
  if (normalizeCategoryLookup(category) === 'accessories') {
    const accessoryMatch = products.find(product => normalizeCategoryLookup(product.category) === 'accessories');
    const media = accessoryMatch ? getPrimaryProductMedia(accessoryMatch) : null;
    const icon = media?.primaryView?.url || media?.hoverView?.url || '';

    return [{
      id: 'statement-jewellery',
      name: 'Statement Jewellery',
      slug: 'statement-jewellery',
      href: `#/shop?cat=${encodeURIComponent('Accessories')}`,
      icon
    }];
  }

  const options = deriveSubcategoryOptions(products, category);
  const fallbackCategoryKey = getInventoryStructureCategoryKey(category);
  const fallbackOptions = (INVENTORY_STRUCTURE[fallbackCategoryKey] || []).map(name => ({ name, count: 0 }));
  const bannerOptions = options.length > 0 ? options : fallbackOptions;

  return bannerOptions.map(item => {
    const match = findSubcategoryBannerMatch(products, item.name);
    const media = match ? getPrimaryProductMedia(match) : null;
    const icon = media?.primaryView?.url || media?.hoverView?.url || '';

    return {
      id: String(item.name),
      name: item.name,
      slug: normalizeSlug(item.name),
      href: `#/shop?cat=${encodeURIComponent(category)}&subcat=${encodeURIComponent(item.name)}`,
      icon
    };
  });
}

function renderSubcategoryBanner(items = []) {
  return items.map(item => `
    <a href="${item.href}" class="shop-subcategory-chip" data-subcategory-chip>
      <span class="shop-subcategory-chip-icon${item.icon ? ' has-image' : ''}">
        <span class="shop-subcategory-chip-icon-inner">
          ${item.icon ? `<img src="${toThumbnailUrl(item.icon)}" alt="${escapeHtml(item.name)}" width="56" height="56" loading="lazy" decoding="async">` : `<span>${escapeHtml(item.name.charAt(0))}</span>`}
        </span>
      </span>
      <span class="shop-subcategory-chip-label">${escapeHtml(item.name)}</span>
    </a>
  `).join('');
}

function buildSubcategoryDropdownGroups(products = []) {
  return [
    { key: 'bags', label: 'Bags', items: buildBagsBannerItems(products, 'Bags') },
    { key: 'accessories', label: 'Accessories', items: buildBagsBannerItems(products, 'Accessories') }
  ].filter(group => Array.isArray(group.items) && group.items.length > 0);
}

function renderSubcategoryDropdowns(groups = [], activeCategory = 'Bags') {
  const activeKey = normalizeCategoryLookup(activeCategory) || 'bags';

  return groups.map(group => {
    const isActive = group.key === activeKey;

    return `
      <div class="shop-subcategory-row${isActive ? ' is-active' : ''}" data-subcategory-row="${group.key}">
        <div class="shop-subcategory-row-title">${escapeHtml(group.label)}</div>
        <div class="shop-subcategory-track">
          ${renderSubcategoryBanner(group.items)}
        </div>
      </div>
    `;
  }).join('');
}

function getProductColorSwatches(product) {
  const colors = getProductColorsFromMedia(product).slice(0, 5);
  return colors.map(color => `<span class="shop-card-swatch" style="--swatch:${escapeHtml(color.hex)}" title="${escapeHtml(color.name)}"></span>`).join('');
}

function getCardImagePair(product) {
  const media = getPrimaryProductMedia(product);
  const primary = getProductImageAttrs(toThumbnailUrl(media.primaryView?.url || product.image_url || product.image), {
    desktopWidth: 900,
    sizes: '(max-width: 640px) 92vw, (max-width: 980px) 46vw, (max-width: 1320px) 31vw, 24vw',
    aspectRatio: '4:5'
  });
  const hover = getProductImageAttrs(toThumbnailUrl(media.hoverView?.url || media.primaryView?.url || product.image_url || product.image), {
    desktopWidth: 900,
    sizes: '(max-width: 640px) 92vw, (max-width: 980px) 46vw, (max-width: 1320px) 31vw, 24vw',
    aspectRatio: '4:5'
  });

  return { primary, hover, hasHover: media.hoverView && media.hoverView.url && media.hoverView.url !== media.primaryView?.url };
}

function parseShopRouteFilters() {
  const hash = String(window.location.hash || '');
  const queryString = hash.includes('?') ? hash.split('?').slice(1).join('?') : '';
  const params = new URLSearchParams(queryString);

  return {
    category: String(params.get('cat') || '').trim(),
    subcategory: String(params.get('subcat') || '').trim()
  };
}

function normalizeLookup(value) {
  return String(value || '').trim().toLowerCase();
}

function renderProductCard(product, wished, compared, layoutMode = 'grid-3', isFeatured = false) {
  const stock = getStockLabel(product.stock);
  const mediaPair = getCardImagePair(product);
  const colorSwatches = getProductColorSwatches(product);
  const featuredClass = isFeatured ? ' is-featured' : '';
  const cardLayoutClass = layoutMode === 'list' ? ' is-list' : layoutMode === 'grid-2' ? ' is-grid-2' : ' is-grid-3';

  return `
    <article class="shop-product-card${featuredClass}${cardLayoutClass}" data-product-id="${product.id}">
      <div class="shop-card-image">
        <a href="#/product/${product.id}" class="shop-card-image-link">
          <div class="shop-card-image-stack${mediaPair.hasHover ? ' has-hover' : ''}">
            <img
              class="lazy-image shop-card-image-primary"
              src="${mediaPair.primary.placeholder}"
              data-src="${mediaPair.primary.src}"
              data-srcset="${mediaPair.primary.srcset}"
              sizes="${mediaPair.primary.sizes}"
              width="800"
              height="1000"
              alt="${escapeHtml(product.name)}"
              decoding="async"
              loading="lazy"
            >
            ${mediaPair.hasHover ? `
              <img
                class="lazy-image shop-card-image-hover"
                src="${mediaPair.hover.placeholder}"
                data-src="${mediaPair.hover.src}"
                data-srcset="${mediaPair.hover.srcset}"
                sizes="${mediaPair.hover.sizes}"
                width="800"
                height="1000"
                alt="${escapeHtml(product.name)} alternate angle"
                decoding="async"
                loading="lazy"
              >
            ` : ''}
            <button class="shop-heart-icon${wished ? ' is-active' : ''}" data-product-id="${product.id}" data-action="wishlist" title="${wished ? 'Remove from wishlist' : 'Add to wishlist'}">
              <i class="fas fa-heart"></i>
            </button>
          </div>
        </a>
      </div>
      <div class="shop-card-info">
        <div class="shop-card-meta-line">
          <span class="shop-card-category">${escapeHtml(product.category || 'Bags')}</span>
          ${isFeatured ? '<span class="shop-featured-pill">Featured</span>' : ''}
        </div>
        <h3 class="shop-card-title">${escapeHtml(product.name)}</h3>
        <p class="shop-card-price">${formatINR(product.price)}</p>
        <span class="shop-stock-badge ${stock.css}">${stock.text}</span>
      </div>
    </article>
  `;
}

function getCategoryCopy(category = 'Bags') {
  const label = String(category || 'Bags').trim() || 'Bags';
  const normalized = label.toLowerCase();

  if (normalized === 'accessories') {
    return {
      label: 'Accessories',
      kicker: 'Accessories Collection',
      title: 'Discover the finishing details that complete the look',
      copy: 'Explore refined add-ons, gifting pieces, and everyday accents curated for effortless styling.'
    };
  }

  return {
    label: 'Bags',
    kicker: 'Bags Collection',
    title: '',
    copy: ''
  };
}

export function ShopPage(category = 'Bags') {
  const categoryCopy = getCategoryCopy(category);
  return `
    <div class="container section section-compact shop-plp-shell">

      <div class="shop-top-bar">
        <section class="shop-filter-strip" aria-label="Shop filters">
          <div class="shop-filter-card" aria-label="Price filter">
            <h3>Price</h3>
            <div class="shop-price-inputs">
              <input id="shop-price-min" type="number" min="0" step="100" value="0" placeholder="Min">
              <span>-</span>
              <input id="shop-price-max" type="number" min="0" step="100" value="100000" placeholder="Max">
            </div>
            <button id="shop-price-apply" type="button" class="btn btn-outline btn-sm">Apply</button>
            <div class="shop-price-range" aria-label="Price range slider" style="display: none;">
              <div class="shop-price-range-track"></div>
              <div class="shop-price-range-fill" id="shop-price-range-fill"></div>
              <input id="shop-price-min-range" class="shop-price-range-input min" type="range" min="0" max="10000" step="100" value="0" aria-label="Minimum price">
              <input id="shop-price-max-range" class="shop-price-range-input max" type="range" min="0" max="10000" step="100" value="10000" aria-label="Maximum price">
            </div>
            <div class="shop-price-pills" aria-live="polite" style="display: none;">
              <span id="shop-price-min-pill">₹0</span>
              <span id="shop-price-max-pill">₹100,000</span>
            </div>
          </div>
        </section>

        <div class="shop-control-bar" id="shop-control-bar">
          <label class="shop-sort-wrap">
            <span>Sort By:</span>
            <select id="shop-sort">
              <option value="featured-first">Featured First</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </label>
        </div>

        <div class="shop-grid-meta" id="shop-grid-meta">
          <button type="button" class="shop-view-btn shop-view-3col is-active" data-layout="grid-3" title="Three-column view" aria-label="Three-column view">
            <i class="fas fa-th" aria-hidden="true"></i>
          </button>
          <button type="button" class="shop-view-btn shop-view-2col" data-layout="grid-2" title="Two-column view" aria-label="Two-column view">
            <i class="fas fa-th-large" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="shop-plp-layout">
        <main class="shop-main">
          <div id="shop-grid" class="shop-grid">
            <div class="profile-loading" style="grid-column: 1 / -1;">Loading products...</div>
          </div>
        </main>
      </div>
    </div>
  `;
}

export async function initShopPage() {
  const grid = document.getElementById('shop-grid');
  const sortSelect = document.getElementById('shop-sort');
  const priceMinInput = document.getElementById('shop-price-min');
  const priceMaxInput = document.getElementById('shop-price-max');
  const priceMinRange = document.getElementById('shop-price-min-range');
  const priceMaxRange = document.getElementById('shop-price-max-range');
  const priceRangeFill = document.getElementById('shop-price-range-fill');
  const priceMinPill = document.getElementById('shop-price-min-pill');
  const priceMaxPill = document.getElementById('shop-price-max-pill');
  const priceApplyButton = document.getElementById('shop-price-apply');
  const routeFilters = parseShopRouteFilters();
  const defaultCategory = routeFilters.category || 'Bags';
  let catalogProducts = [];
  let wishlistIds = new Set();
  let selectedMinPrice = 0;
  let selectedMaxPrice = 100000;
  let currentLayout = localStorage.getItem('shop.layout') || 'grid-3';
  let unsubscribe = () => {};
  const activeCategoryKey = normalizeCategoryLookup(defaultCategory);
  const maxPriceCap = 100000;

  if (!grid || !sortSelect || !priceMinInput || !priceMaxInput || !priceMinRange || !priceMaxRange || !priceRangeFill || !priceApplyButton) {
    return;
  }

  const bindViewLayoutButtons = () => {
    document.querySelectorAll('.shop-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const layout = btn.getAttribute('data-layout');
        if (!layout) return;
        
        currentLayout = layout;
        localStorage.setItem('shop.layout', layout);
        grid.className = `shop-grid ${layout === 'grid-2' ? 'is-grid-2' : layout === 'list' ? 'is-list' : ''}`;
        
        document.querySelectorAll('.shop-view-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        
        renderResults(catalogProducts);
      });
    });
  };
  
  bindViewLayoutButtons();

  const clampPriceValue = value => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.max(0, Math.min(maxPriceCap, Math.round(parsed)));
  };

  const formatPriceLabel = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const setPriceRange = (min, max) => {
    let nextMin = clampPriceValue(min);
    let nextMax = clampPriceValue(max);

    if (nextMax < nextMin) {
      [nextMin, nextMax] = [nextMax, nextMin];
    }

    selectedMinPrice = nextMin;
    selectedMaxPrice = nextMax;

    priceMinInput.value = String(nextMin);
    priceMaxInput.value = String(nextMax);
    priceMinRange.value = String(nextMin);
    priceMaxRange.value = String(nextMax);

    const minPercent = (nextMin / maxPriceCap) * 100;
    const maxPercent = (nextMax / maxPriceCap) * 100;
    priceRangeFill.style.left = `${minPercent}%`;
    priceRangeFill.style.right = `${100 - maxPercent}%`;

    if (priceMinPill) {
      priceMinPill.textContent = formatPriceLabel(nextMin);
    }
    if (priceMaxPill) {
      priceMaxPill.textContent = formatPriceLabel(nextMax);
    }
  };

  const syncFromRangeInputs = source => {
    let min = clampPriceValue(priceMinRange.value);
    let max = clampPriceValue(priceMaxRange.value);

    if (min > max) {
      if (source === 'min') {
        max = min;
      } else {
        min = max;
      }
    }

    setPriceRange(min, max);
  };

  const resolvePriceRange = () => {
    setPriceRange(priceMinInput.value, priceMaxInput.value);
  };

  const matchesCategory = product => {
    if (!activeCategoryKey) {
      return true;
    }
    return normalizeCategoryLookup(product?.category) === activeCategoryKey;
  };

  const matchesPrice = product => {
    const price = Number(product?.price || 0);
    return Number.isFinite(price) && price >= selectedMinPrice && price <= selectedMaxPrice;
  };

  const renderResults = products => {
    let visibleProducts = products.filter(product => matchesCategory(product) && matchesPrice(product));

    if (visibleProducts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-box-open" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem; display: block;"></i>
          <h3>No products found</h3>
          <p style="color: var(--text-secondary);">Try adjusting your filters or check back later.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = visibleProducts.map((product, index) => renderProductCard(
      product,
      wishlistIds.has(product.id),
      false,
      currentLayout,
      index === 0
    )).join('');
    initLazyLoading();
    attachCardHandlers();
    window.dispatchEvent(new CustomEvent('catalogHydrated', { detail: { products: visibleProducts } }));
  };

  const refreshProducts = async () => {
    const sort = sortSelect.value || 'featured-first';
    const prioritizeDisplayOrder = sort === 'featured-first';
    const backendSort = prioritizeDisplayOrder ? 'newest' : sort;

    const result = await getProductsCatalogAdvanced({
      minPrice: 0,
      maxPrice: 100000,
      sort: backendSort,
      prioritizeDisplayOrder,
      limit: 240,
      category: defaultCategory
    });

    let finalResult = result;
    if (
      result.success
      && Array.isArray(result.data)
      && result.data.length === 0
      && defaultCategory
    ) {
      const fallbackResult = await getProductsCatalogAdvanced({
        minPrice: 0,
        maxPrice: 100000,
        sort: backendSort,
        prioritizeDisplayOrder,
        limit: 240
      });
      if (fallbackResult.success) {
        finalResult = fallbackResult;
      }
    }

    if (!finalResult.success || !Array.isArray(finalResult.data)) {
      if (cloudflareConfig.apiBaseUrl && !finalResult.success) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <i class="fas fa-triangle-exclamation" style="font-size: 2.5rem; color: var(--text-secondary); margin-bottom: 1rem; display: block;"></i>
            <h3>Backend connection error</h3>
            <p style="color: var(--text-secondary);">Could not fetch shop products from Worker API. Check env API URL and Worker logs.</p>
          </div>
        `;
        resultsCount.textContent = 'Backend unavailable';
      }
      return;
    }

    catalogProducts = finalResult.data;
    writeShopCatalogCache(defaultCategory, catalogProducts);
    renderResults(catalogProducts);
  };

  const attachCardHandlers = () => {
    document.querySelectorAll('[data-action="wishlist"]').forEach(btn => {
      if (btn.dataset.wishlistBound === 'true') {
        return;
      }
      btn.dataset.wishlistBound = 'true';
      btn.addEventListener('click', async event => {
        event.preventDefault();
        const productId = String(btn.getAttribute('data-product-id') || '').trim();
        if (!productId) {
          return;
        }
        const result = await toggleWishlistProductSync(productId);
        if (result.success) {
          if (result.active) {
            wishlistIds.add(productId);
            btn.classList.add('is-active');
          } else {
            wishlistIds.delete(productId);
            btn.classList.remove('is-active');
          }
        } else if (result.error === 'Please login first') {
          showAuthRequiredPopup('Sign in to add items to your wishlist and sync it across devices.');
        }
      });
    });
  };

  const cachedProducts = readShopCatalogCache(defaultCategory);
  if (cachedProducts.length > 0) {
    catalogProducts = cachedProducts;
    renderResults(catalogProducts);
  }

  const initialProductsPromise = refreshProducts();

  // Load wishlist without blocking the first products paint.
  const wishlistResult = await getUserWishlist();

  wishlistIds = new Set((wishlistResult.success && Array.isArray(wishlistResult.data) ? wishlistResult.data : []).map(item => String(item).trim()).filter(Boolean));
  if (catalogProducts.length > 0) {
    renderResults(catalogProducts);
  }

  priceApplyButton.addEventListener('click', () => {
    resolvePriceRange();
    renderResults(catalogProducts);
  });

  [priceMinRange, priceMaxRange].forEach(input => {
    input.addEventListener('input', () => {
      syncFromRangeInputs(input === priceMinRange ? 'min' : 'max');
      renderResults(catalogProducts);
    });
  });

  [priceMinInput, priceMaxInput].forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        priceApplyButton.click();
      }
    });
    input.addEventListener('change', () => {
      resolvePriceRange();
      renderResults(catalogProducts);
    });
  });

  setPriceRange(selectedMinPrice, selectedMaxPrice);

  sortSelect.addEventListener('change', refreshProducts);

  window.addEventListener('hashchange', () => {
    unsubscribe();
  }, { once: true });

  await initialProductsPromise;
  unsubscribe = subscribeCatalogRealtime(async () => {
    await refreshProducts();
  });
}
