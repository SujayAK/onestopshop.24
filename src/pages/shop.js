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

function buildTaxonomyTree(rows = []) {
  const map = {};
  rows.forEach(row => {
    const parent = row.parent_id;
    if (!map[parent]) {
      map[parent] = [];
    }
    map[parent].push(row);
  });
  return map;
}

function getTaxonomyChildrenCount(itemId, tree) {
  const directChildren = tree[itemId] || [];
  return directChildren.reduce((count, child) => count + 1 + getTaxonomyChildrenCount(child.id, tree), 0);
}

function renderTaxonomyLevel(parentId, tree, depth = 0) {
  const items = tree[parentId] || [];
  if (items.length === 0) return '';

  return items.map(item => `
    <div class="shop-tax-item" data-depth="${depth}" data-id="${item.id}">
      <div class="shop-tax-row">
        <label class="shop-tax-label">
          <input type="checkbox" class="shop-tax-checkbox" data-taxonomy-id="${item.id}" value="${item.id}">
          <span>${escapeHtml(item.name)}</span>
        </label>
        ${tree[item.id] ? `<button type="button" class="shop-tax-toggle" data-taxonomy-toggle="${item.id}" aria-expanded="false" aria-label="Expand ${escapeHtml(item.name)}">+</button>` : ''}
      </div>
      ${tree[item.id] ? `<div class="shop-tax-children is-collapsed" data-taxonomy-children="${item.id}">${renderTaxonomyLevel(item.id, tree, depth + 1)}</div>` : ''}
    </div>
  `).join('');
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

function deriveSubcategoryOptions(products = [], category = '') {
  const normalizedCategory = normalizeLookup(category);
  const scopedProducts = products.filter(product => {
    if (!normalizedCategory) {
      return true;
    }
    return normalizeLookup(product.category) === normalizedCategory;
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

function buildBagsBannerItems(products = [], category = 'Bags') {
  const options = deriveSubcategoryOptions(products, category);

  return options.map(item => {
    const match = products.find(product => normalizeLookup(product.subcategory) === normalizeLookup(item.name));
    const media = getPrimaryProductMedia(match || products[0] || {});
    const icon = media.primaryView?.url || media.hoverView?.url || '';

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
      <span class="shop-subcategory-chip-icon">
        ${item.icon ? `<img src="${toThumbnailUrl(item.icon)}" alt="${escapeHtml(item.name)}" width="56" height="56" loading="lazy" decoding="async">` : `<span>${escapeHtml(item.name.charAt(0))}</span>`}
      </span>
      <span class="shop-subcategory-chip-label">${escapeHtml(item.name)}</span>
    </a>
  `).join('');
}

function renderFilterCheckbox(label, value, checked = false) {
  return `
    <label class="shop-filter-check">
      <input type="checkbox" value="${escapeHtml(value)}" ${checked ? 'checked' : ''}>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
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

function findTaxonomyCheckboxByName(name) {
  const target = normalizeLookup(name);
  if (!target) {
    return null;
  }

  return Array.from(document.querySelectorAll('.shop-tax-checkbox')).find(checkbox => {
    const labelText = checkbox.closest('.shop-tax-label')?.textContent || '';
    return normalizeLookup(labelText) === target;
  }) || null;
}

function expandTaxonomyToggleForCheckbox(checkbox) {
  const item = checkbox?.closest('.shop-tax-item');
  const parentChildren = item?.parentElement;
  if (!parentChildren) {
    return;
  }

  const parentId = parentChildren.getAttribute('data-taxonomy-children');
  if (!parentId) {
    return;
  }

  const toggle = document.querySelector(`[data-taxonomy-toggle="${parentId}"]`);
  const children = document.querySelector(`[data-taxonomy-children="${parentId}"]`);
  if (toggle && children && children.classList.contains('is-collapsed')) {
    toggle.click();
  }
}

function applyRouteTaxonomyFilters(routeFilters) {
  const category = normalizeLookup(routeFilters.category);
  const subcategory = normalizeLookup(routeFilters.subcategory);

  if (!category) {
    return;
  }

  const categoryCheckbox = findTaxonomyCheckboxByName(routeFilters.category);
  if (categoryCheckbox) {
    categoryCheckbox.checked = true;
    expandTaxonomyToggleForCheckbox(categoryCheckbox);

    const categoryItem = categoryCheckbox.closest('.shop-tax-item');
    const categoryId = categoryItem?.getAttribute('data-id');
    const categoryChildren = categoryId ? document.querySelector(`[data-taxonomy-children="${categoryId}"]`) : null;
    if (categoryChildren) {
      categoryChildren.querySelectorAll('.shop-tax-checkbox').forEach(checkbox => {
        checkbox.checked = true;
      });
    }
  }

  if (subcategory) {
    const subcategoryCheckbox = findTaxonomyCheckboxByName(routeFilters.subcategory);
    if (subcategoryCheckbox) {
      subcategoryCheckbox.checked = true;
      expandTaxonomyToggleForCheckbox(subcategoryCheckbox);
    }
  }
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
        </div>
        <div class="shop-card-actions">
          <button class="shop-heart-icon${wished ? ' is-active' : ''}" data-product-id="${product.id}" data-action="wishlist" title="${wished ? 'Remove from wishlist' : 'Add to wishlist'}">
            <i class="fas fa-heart"></i>
          </button>
        </div>
      </div>
      <div class="shop-card-info">
        <div class="shop-card-meta-line">
          <span class="shop-card-category">${escapeHtml(product.category || 'Bags')}</span>
          ${isFeatured ? '<span class="shop-featured-pill">Featured</span>' : ''}
        </div>
        <h3 class="shop-card-title">${escapeHtml(product.name)}</h3>
        <p class="shop-card-price">${formatINR(product.price)}</p>
        ${colorSwatches ? `<div class="shop-card-colors">${colorSwatches}</div>` : ''}
        <span class="shop-stock-badge ${stock.css}">${stock.text}</span>
        <div class="shop-card-buttons">
          <button class="btn btn-sm add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
          <a href="#/product/${product.id}" class="btn btn-sm btn-outline">Details</a>
        </div>
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
    title: 'Discover your next signature carry',
    copy: 'Explore the most relevant silhouettes and jump straight into the color, fit, and function you need.'
  };
}

export function ShopPage(category = 'Bags') {
  const categoryCopy = getCategoryCopy(category);
  return `
    <div class="container section section-compact shop-plp-shell">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <span>${escapeHtml(categoryCopy.label)}</span>
      </div>

      <section class="shop-subcategory-banner" aria-label="${escapeHtml(categoryCopy.label)} subcategories">
        <div class="shop-subcategory-banner-head">
          <div>
            <p class="shop-banner-kicker">${escapeHtml(categoryCopy.kicker)}</p>
            <h1>${escapeHtml(categoryCopy.title)}</h1>
          </div>
          <p class="shop-banner-copy">${escapeHtml(categoryCopy.copy)}</p>
        </div>
        <div id="shop-subcategory-banner-track" class="shop-subcategory-track">
          <div class="shop-subcategory-skeleton">Loading subcategories...</div>
        </div>
      </section>

      <div class="shop-control-bar" id="shop-control-bar">
        <div class="shop-control-count" id="shop-results-count">Loading products...</div>
        <div class="shop-control-actions">
          <div class="shop-layout-toggle" role="group" aria-label="Layout view toggles">
            <button type="button" class="shop-layout-btn is-active" data-layout="grid-3" aria-label="3 column grid"><i class="fas fa-border-all"></i></button>
            <button type="button" class="shop-layout-btn" data-layout="grid-2" aria-label="2 column grid"><i class="fas fa-border-none"></i></button>
            <button type="button" class="shop-layout-btn" data-layout="list" aria-label="List view"><i class="fas fa-list"></i></button>
          </div>
          <button type="button" class="shop-filter-open-btn" id="shop-filter-open-btn"><i class="fas fa-sliders"></i><span>Filter</span></button>
        </div>
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

      <div id="shop-filter-overlay" class="shop-filter-overlay" hidden></div>

      <div class="shop-plp-layout">
        <aside class="shop-sidebar" id="shop-sidebar">
          <div class="shop-sidebar-head">
            <span>Filters</span>
            <button type="button" class="shop-sidebar-close-btn" id="shop-filter-close-btn">Close</button>
          </div>

          <div class="shop-filter-section shop-filter-accordion is-open">
            <button type="button" class="shop-filter-accordion-trigger" aria-expanded="true">
              <span>Availability</span>
              <i class="fas fa-plus"></i>
            </button>
            <div class="shop-filter-accordion-panel">
              <div class="shop-filter-options">
                ${renderFilterCheckbox('In stock', 'in-stock')}
                ${renderFilterCheckbox('Out of stock', 'out-of-stock')}
              </div>
            </div>
          </div>

          <div class="shop-filter-section shop-filter-accordion is-open">
            <button type="button" class="shop-filter-accordion-trigger" aria-expanded="true">
              <span>Price</span>
              <i class="fas fa-plus"></i>
            </button>
            <div class="shop-filter-accordion-panel">
              <div class="price-range-container">
                <div class="price-slider-wrapper">
                  <input type="range" id="shop-min-price" class="price-slider price-slider-min" min="0" max="100000" value="0" step="100">
                  <input type="range" id="shop-max-price" class="price-slider price-slider-max" min="0" max="100000" value="100000" step="100">
                  <div class="price-slider-track"></div>
                  <div class="price-slider-fill"></div>
                </div>
                <div class="price-range-display">
                  <span class="price-min-display">₹0</span>
                  <span class="price-dash">—</span>
                  <span class="price-max-display">₹100,000</span>
                </div>
              </div>
            </div>
          </div>

          <div class="shop-filter-section shop-filter-accordion is-open">
            <button type="button" class="shop-filter-accordion-trigger" aria-expanded="true">
              <span>Color</span>
              <i class="fas fa-plus"></i>
            </button>
            <div class="shop-filter-accordion-panel">
              <div id="shop-color-filter" class="shop-color-filter-grid"></div>
            </div>
          </div>

          <div class="shop-filter-section shop-filter-accordion is-open">
            <button type="button" class="shop-filter-accordion-trigger" aria-expanded="true">
              <span>Category</span>
              <i class="fas fa-plus"></i>
            </button>
            <div class="shop-filter-accordion-panel">
              <p class="shop-filter-helper">Choose one or more categories. Expand the root item to select subcategories.</p>
              <div id="shop-taxonomy" class="shop-taxonomy-tree"></div>
              <div class="shop-taxonomy-actions">
                <button type="button" id="shop-clear-categories" class="btn btn-outline btn-sm">Clear Categories</button>
                <span id="shop-category-summary" class="shop-category-summary">All categories</span>
              </div>
            </div>
          </div>

          <button id="shop-reset-filters" class="btn btn-outline">Reset Filters</button>
        </aside>

        <main class="shop-main">
          <div class="shop-grid-meta" id="shop-grid-meta"></div>
          <div id="shop-grid" class="shop-grid">
            <div class="profile-loading" style="grid-column: 1 / -1;">Loading products...</div>
          </div>
        </main>
      </div>
    </div>
  `;
}

export async function initShopPage() {
  const taxonomyContainer = document.getElementById('shop-taxonomy');
  const bannerTrack = document.getElementById('shop-subcategory-banner-track');
  const grid = document.getElementById('shop-grid');
  const resultsCount = document.getElementById('shop-results-count');
  const gridMeta = document.getElementById('shop-grid-meta');
  const minPriceInput = document.getElementById('shop-min-price');
  const maxPriceInput = document.getElementById('shop-max-price');
  const minPriceDisplay = document.querySelector('.price-min-display');
  const maxPriceDisplay = document.querySelector('.price-max-display');
  const priceSliderFill = document.querySelector('.price-slider-fill');
  const sortSelect = document.getElementById('shop-sort');
  const resetBtn = document.getElementById('shop-reset-filters');
  const clearCategoriesBtn = document.getElementById('shop-clear-categories');
  const categorySummary = document.getElementById('shop-category-summary');
  const filterOpenBtn = document.getElementById('shop-filter-open-btn');
  const filterOverlay = document.getElementById('shop-filter-overlay');
  const filterCloseBtn = document.getElementById('shop-filter-close-btn');
  const sidebar = document.getElementById('shop-sidebar');
  const layoutButtons = document.querySelectorAll('.shop-layout-btn');
  const colorFilterContainer = document.getElementById('shop-color-filter');
  const routeFilters = parseShopRouteFilters();
  const defaultCategory = routeFilters.category || 'Bags';
  let catalogProducts = [];
  let wishlistIds = new Set();
  let selectedColor = 'all';
  let selectedAvailability = new Set();
  let selectedSubcategories = new Set(routeFilters.subcategory ? [normalizeLookup(routeFilters.subcategory)] : []);
  let currentLayout = localStorage.getItem('shop.layout') || 'grid-3';
  let unsubscribe = () => {};

  if (!grid || !taxonomyContainer || !sidebar || !bannerTrack || !colorFilterContainer) {
    return;
  }

  const formatPrice = value => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  const updatePriceDisplay = () => {
    const minVal = Number(minPriceInput.value);
    const maxVal = Number(maxPriceInput.value);
    minPriceDisplay.textContent = formatPrice(minVal);
    maxPriceDisplay.textContent = formatPrice(maxVal);
    const minPercent = (minVal / Number(minPriceInput.max)) * 100;
    const maxPercent = (maxVal / Number(maxPriceInput.max)) * 100;
    priceSliderFill.style.left = `${minPercent}%`;
    priceSliderFill.style.right = `${100 - maxPercent}%`;
  };

  const openFilters = () => {
    sidebar.classList.add('is-open');
    if (filterOverlay) {
      filterOverlay.hidden = false;
    }
    document.body.classList.add('shop-filter-drawer-open');
  };

  const closeFilters = () => {
    sidebar.classList.remove('is-open');
    if (filterOverlay) {
      filterOverlay.hidden = true;
    }
    document.body.classList.remove('shop-filter-drawer-open');
  };

  const setLayout = layout => {
    currentLayout = layout;
    localStorage.setItem('shop.layout', layout);
    layoutButtons.forEach(button => {
      button.classList.toggle('is-active', button.getAttribute('data-layout') === layout);
    });
    grid.dataset.layout = layout;
    grid.classList.remove('is-grid-2', 'is-grid-3', 'is-list');
    grid.classList.add(`is-${layout}`);
  };

  const matchesColorFilter = product => {
    if (selectedColor === 'all') {
      return true;
    }
    const target = selectedColor.toLowerCase();
    const colors = getProductColorsFromMedia(product);
    return colors.some(color => normalizeText(color.name).toLowerCase() === target || normalizeText(color.hex).toLowerCase() === target);
  };

  const matchesAvailability = product => {
    if (selectedAvailability.size === 0) {
      return true;
    }

    const stock = Number(product.stock || 0);
    const checks = {
      'in-stock': stock > 0,
      'out-of-stock': stock <= 0
    };

    return [...selectedAvailability].some(key => Boolean(checks[key]));
  };

  const matchesSubcategory = product => {
    if (selectedSubcategories.size === 0) {
      return true;
    }

    return selectedSubcategories.has(normalizeLookup(product.subcategory));
  };

  const updateCategorySummary = () => {
    if (!categorySummary) {
      return;
    }

    const labels = Array.from(document.querySelectorAll('.shop-subcategory-checkbox:checked'))
      .map(cb => cb.getAttribute('data-subcategory-label') || cb.value)
      .filter(Boolean);

    categorySummary.textContent = labels.length > 0
      ? labels.slice(0, 3).join(', ') + (labels.length > 3 ? ` +${labels.length - 3}` : '')
      : 'All categories';
  };

  const updateCategoryFilters = products => {
    const options = deriveSubcategoryOptions(products, defaultCategory);

    if (options.length === 0) {
      taxonomyContainer.innerHTML = '<p class="shop-filter-helper">No subcategories available yet.</p>';
      selectedSubcategories = new Set();
      updateCategorySummary();
      return;
    }

    selectedSubcategories = new Set(
      [...selectedSubcategories].filter(selected => options.some(option => normalizeLookup(option.name) === selected))
    );

    taxonomyContainer.innerHTML = options.map(option => {
      const normalized = normalizeLookup(option.name);
      const checked = selectedSubcategories.has(normalized);
      return `
        <label class="shop-filter-check">
          <input
            type="checkbox"
            class="shop-subcategory-checkbox"
            data-subcategory-label="${escapeHtml(option.name)}"
            value="${escapeHtml(option.name)}"
            ${checked ? 'checked' : ''}
          >
          <span>${escapeHtml(option.name)}</span>
          <small style="margin-left:auto;color:#87677a;">${option.count}</small>
        </label>
      `;
    }).join('');

    taxonomyContainer.querySelectorAll('.shop-subcategory-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        selectedSubcategories = new Set(
          Array.from(taxonomyContainer.querySelectorAll('.shop-subcategory-checkbox:checked'))
            .map(node => normalizeLookup(node.value))
            .filter(Boolean)
        );
        updateFilters();
      });
    });

    updateCategorySummary();
  };

  const updateColorFilter = products => {
    const colors = deriveFilterColors(products);
    if (colors.length === 0) {
      colorFilterContainer.innerHTML = '<p class="shop-filter-helper">No color data available yet.</p>';
      return;
    }

    colorFilterContainer.innerHTML = `
      <button type="button" class="shop-color-filter-chip${selectedColor === 'all' ? ' is-active' : ''}" data-color-filter="all">
        <span class="shop-color-filter-dot" style="--swatch:#d9c7d2"></span>
        <span>All</span>
      </button>
      ${colors.map(color => `
        <button type="button" class="shop-color-filter-chip${selectedColor.toLowerCase() === normalizeText(color.name).toLowerCase() || selectedColor.toLowerCase() === normalizeText(color.hex).toLowerCase() ? ' is-active' : ''}" data-color-filter="${escapeHtml(color.name)}" title="${escapeHtml(color.name)}">
          <span class="shop-color-filter-dot" style="--swatch:${escapeHtml(color.hex)}"></span>
          <span>${escapeHtml(color.name)}</span>
        </button>
      `).join('')}
    `;

    colorFilterContainer.querySelectorAll('[data-color-filter]').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.getAttribute('data-color-filter') || 'all';
        selectedColor = value === 'all' ? 'all' : value;
        colorFilterContainer.querySelectorAll('[data-color-filter]').forEach(item => item.classList.toggle('is-active', item === button));
        refreshProducts();
      });
    });
  };

  const updateBanner = products => {
    const items = buildBagsBannerItems(products, defaultCategory);
    bannerTrack.innerHTML = renderSubcategoryBanner(items);
  };

  const renderResults = products => {
    const visibleProducts = products.filter(product => matchesAvailability(product) && matchesColorFilter(product) && matchesSubcategory(product));
    if (visibleProducts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-box-open" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem; display: block;"></i>
          <h3>No products found</h3>
          <p style="color: var(--text-secondary);">Try adjusting your filters or check back later.</p>
        </div>
      `;
      resultsCount.textContent = '0 products found';
      if (gridMeta) {
        gridMeta.textContent = 'No matching results';
      }
      return;
    }

    resultsCount.textContent = `${visibleProducts.length} product${visibleProducts.length === 1 ? '' : 's'} found`;
    if (gridMeta) {
      gridMeta.textContent = currentLayout === 'list' ? 'Curated list view' : 'Premium product grid';
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
    const minPrice = Number(minPriceInput.value) || 0;
    const maxPrice = Number(maxPriceInput.value) || 100000;
    const sort = sortSelect.value || 'newest';
    const prioritizeDisplayOrder = sort === 'featured-first';
    const backendSort = prioritizeDisplayOrder ? 'newest' : sort;

    const result = await getProductsCatalogAdvanced({
      minPrice,
      maxPrice,
      sort: backendSort,
      prioritizeDisplayOrder,
      limit: 240,
      category: defaultCategory
    });

    if (!result.success || !Array.isArray(result.data)) {
      if (cloudflareConfig.apiBaseUrl && !result.success) {
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

    catalogProducts = result.data;
    writeShopCatalogCache(defaultCategory, catalogProducts);
    updateCategoryFilters(catalogProducts);
    updateBanner(catalogProducts);
    updateColorFilter(catalogProducts);
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

  const updateFilters = () => {
    selectedAvailability = new Set(Array.from(document.querySelectorAll('#shop-sidebar .shop-filter-options .shop-filter-check input:checked')).map(input => input.value).filter(Boolean));
    updatePriceDisplay();
    updateCategorySummary();
    refreshProducts();
  };

  updatePriceDisplay();

  const cachedProducts = readShopCatalogCache(defaultCategory);
  if (cachedProducts.length > 0) {
    catalogProducts = cachedProducts;
    updateBanner(catalogProducts);
    updateColorFilter(catalogProducts);
    renderResults(catalogProducts);
  }

  const initialProductsPromise = refreshProducts();

  // Load wishlist without blocking the first products paint.
  const wishlistResult = await getUserWishlist();

  wishlistIds = new Set((wishlistResult.success && Array.isArray(wishlistResult.data) ? wishlistResult.data : []).map(item => String(item).trim()).filter(Boolean));
  if (catalogProducts.length > 0) {
    updateCategoryFilters(catalogProducts);
    renderResults(catalogProducts);
  }
  document.querySelectorAll('#shop-sidebar .shop-filter-options .shop-filter-check input').forEach(input => input.addEventListener('change', updateFilters));

  layoutButtons.forEach(button => {
    button.addEventListener('click', () => setLayout(button.getAttribute('data-layout') || 'grid-3'));
  });
  setLayout(currentLayout);

  if (filterOpenBtn) {
    filterOpenBtn.addEventListener('click', openFilters);
  }
  if (filterOverlay) {
    filterOverlay.addEventListener('click', closeFilters);
  }
  if (filterCloseBtn) {
    filterCloseBtn.addEventListener('click', closeFilters);
  }

  document.querySelectorAll('.shop-filter-accordion-trigger').forEach(button => {
    button.addEventListener('click', () => {
      const section = button.closest('.shop-filter-accordion');
      const panel = section?.querySelector('.shop-filter-accordion-panel');
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      section?.classList.toggle('is-open', !expanded);
      if (panel) {
        panel.hidden = expanded;
      }
    });
  });

  minPriceInput.addEventListener('input', () => {
    const minVal = Number(minPriceInput.value);
    const maxVal = Number(maxPriceInput.value);
    if (minVal > maxVal) {
      minPriceInput.value = maxVal;
    }
    updatePriceDisplay();
  });

  maxPriceInput.addEventListener('input', () => {
    const minVal = Number(minPriceInput.value);
    const maxVal = Number(maxPriceInput.value);
    if (maxVal < minVal) {
      maxPriceInput.value = minVal;
    }
    updatePriceDisplay();
  });

  let priceFilterTimeout;
  minPriceInput.addEventListener('change', () => {
    clearTimeout(priceFilterTimeout);
    priceFilterTimeout = setTimeout(updateFilters, 180);
  });
  maxPriceInput.addEventListener('change', () => {
    clearTimeout(priceFilterTimeout);
    priceFilterTimeout = setTimeout(updateFilters, 180);
  });

  sortSelect.addEventListener('change', updateFilters);

  resetBtn.addEventListener('click', () => {
    selectedSubcategories = new Set();
    document.querySelectorAll('#shop-sidebar .shop-filter-options .shop-filter-check input').forEach(input => { input.checked = false; });
    minPriceInput.value = '0';
    maxPriceInput.value = '100000';
    sortSelect.value = 'featured-first';
    selectedColor = 'all';
    updateCategoryFilters(catalogProducts);
    updatePriceDisplay();
    updateFilters();
  });

  if (clearCategoriesBtn) {
    clearCategoriesBtn.addEventListener('click', () => {
      selectedSubcategories = new Set();
      updateCategoryFilters(catalogProducts);
      routeFilters.category = '';
      routeFilters.subcategory = '';
      updateFilters();
    });
  }

  window.addEventListener('hashchange', () => {
    closeFilters();
    unsubscribe();
  }, { once: true });

  await initialProductsPromise;
  unsubscribe = subscribeCatalogRealtime(async () => {
    await refreshProducts();
  });
}
