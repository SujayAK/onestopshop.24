import {
  getTaxonomyTree,
  getProductsCatalogAdvanced,
  getUserWishlist,
  getUserCompare,
  toggleWishlistProductSync,
  toggleCompareProductSync,
  subscribeCatalogRealtime,
  cloudflareConfig
} from '../utils/cloudflare.js';
import { cart } from '../utils/cart.js';
import { getProductImageAttrs, initLazyLoading } from '../utils/image-optimization.js';
import { INVENTORY_STRUCTURE } from '../data/inventory-structure.js';

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

function renderProductCard(product, wished, compared) {
  const colors = getProductColors(product);
  const stock = getStockLabel(product.stock);
  const image = getProductImageAttrs(product.image_url || product.image, {
    desktopWidth: 900,
    sizes: '(max-width: 640px) 92vw, (max-width: 980px) 46vw, (max-width: 1320px) 31vw, 24vw',
    aspectRatio: '4:5'
  });
  const colorSwatches = colors
    .map(c => `<span class="shop-color-dot" style="background:${escapeHtml(c.hex)}" title="${escapeHtml(c.name)}"></span>`)
    .join('');

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
          alt="${escapeHtml(product.name)}"
          decoding="async"
          loading="lazy"
        >
        <div class="shop-card-actions">
          <button class="shop-heart-icon${wished ? ' is-active' : ''}" data-product-id="${product.id}" data-action="wishlist" title="${wished ? 'Remove from wishlist' : 'Add to wishlist'}">
            <i class="fas fa-heart"></i>
          </button>
          <button class="shop-compare-icon${compared ? ' is-active' : ''}" data-product-id="${product.id}" data-action="compare" title="${compared ? 'Remove from compare' : 'Add to compare'}">
            <i class="fas fa-code-compare"></i>
          </button>
        </div>
      </div>
      <div class="shop-card-info">
        <h3 class="shop-card-title">${escapeHtml(product.name)}</h3>
        <p class="shop-card-price">${formatINR(product.price)}</p>
        ${colorSwatches ? `<div class="shop-card-colors">${colorSwatches}</div>` : ''}
        <span class="shop-stock-badge ${stock.css}">${stock.text}</span>
        <div class="shop-card-buttons">
          <button class="btn btn-sm add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
          <a href="#/product/${product.id}" class="btn btn-sm btn-outline">Details</a>
        </div>
      </div>
    </div>
  `;
}

export function ShopPage() {
  return `
    <div class="container section">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <span>Shop</span>
      </div>

      <div class="shop-layout">
        <aside class="shop-sidebar">
          <div class="shop-filter-section">
            <h3>Categories</h3>
            <p class="shop-filter-helper">Choose one or more categories. Click the + to expand subcategories.</p>
            <div id="shop-taxonomy" class="shop-taxonomy-tree"></div>
            <div class="shop-taxonomy-actions">
              <button type="button" id="shop-clear-categories" class="btn btn-outline btn-sm">Clear Categories</button>
              <span id="shop-category-summary" class="shop-category-summary">All categories</span>
            </div>
          </div>

          <div class="shop-filter-section">
            <h3>Price</h3>
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

          <div class="shop-filter-section">
            <h3>Availability</h3>
            <select id="shop-availability">
              <option value="all">All</option>
              <option value="in-stock">In stock</option>
              <option value="low-stock">Low stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
          </div>

          <div class="shop-filter-section">
            <h3>Sort</h3>
            <select id="shop-sort">
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>

          <button id="shop-reset-filters" class="btn btn-outline">Reset Filters</button>
        </aside>

        <main class="shop-main">
          <div class="shop-toolbar">
            <p id="shop-results-count">Loading products...</p>
          </div>

          <div id="shop-grid" class="shop-grid">
            <div class="profile-loading">Loading products...</div>
          </div>
        </main>
      </div>
    </div>
  `;
}

export async function initShopPage() {
  const taxonomyContainer = document.getElementById('shop-taxonomy');
  const minPriceInput = document.getElementById('shop-min-price');
  const maxPriceInput = document.getElementById('shop-max-price');
  const minPriceDisplay = document.querySelector('.price-min-display');
  const maxPriceDisplay = document.querySelector('.price-max-display');
  const priceSliderFill = document.querySelector('.price-slider-fill');
  const availabilitySelect = document.getElementById('shop-availability');
  const sortSelect = document.getElementById('shop-sort');
  const resetBtn = document.getElementById('shop-reset-filters');
  const clearCategoriesBtn = document.getElementById('shop-clear-categories');
  const categorySummary = document.getElementById('shop-category-summary');
  const grid = document.getElementById('shop-grid');
  const resultsCount = document.getElementById('shop-results-count');

  if (!grid || !taxonomyContainer) {
    return;
  }

  // Format currency for display
  const formatPrice = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };

  // Update price display and slider fill
  const updatePriceDisplay = () => {
    const minVal = Number(minPriceInput.value);
    const maxVal = Number(maxPriceInput.value);
    
    minPriceDisplay.textContent = formatPrice(minVal);
    maxPriceDisplay.textContent = formatPrice(maxVal);
    
    const minPercent = (minVal / Number(minPriceInput.max)) * 100;
    const maxPercent = (maxVal / Number(maxPriceInput.max)) * 100;
    
    priceSliderFill.style.left = minPercent + '%';
    priceSliderFill.style.right = (100 - maxPercent) + '%';
  };

  // Load startup data in parallel to reduce first paint latency.
  const [taxonomyResult, wishlistResult, compareResult] = await Promise.all([
    getTaxonomyTree(),
    getUserWishlist(),
    getUserCompare()
  ]);
  if (!taxonomyResult.success && cloudflareConfig.apiBaseUrl) {
    taxonomyContainer.innerHTML = '<p style="color: var(--text-secondary);">Failed to load categories from backend. Showing local development categories instead.</p>';
  }
  const taxonomyRows = taxonomyResult.success && Array.isArray(taxonomyResult.data) && taxonomyResult.data.length > 0
    ? taxonomyResult.data
    : Object.entries(INVENTORY_STRUCTURE).flatMap(([category, subcategories], categoryIndex) => {
        const categoryId = `local-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-') || categoryIndex}`;
        return [
          {
            id: categoryId,
            name: category,
            parent_id: null,
            depth: 1,
            active: true
          },
          ...(subcategories || []).map((subcategory, index) => ({
            id: `${categoryId}-${String(subcategory).toLowerCase().replace(/[^a-z0-9]+/g, '-') || index}`,
            name: subcategory,
            parent_id: categoryId,
            depth: 2,
            active: true
          }))
        ];
      });
  const tree = buildTaxonomyTree(taxonomyRows);

  // Render root level (depth 1)
  const rootItems = taxonomyRows.filter(row => row.depth === 1 || row.depth === undefined);
  taxonomyContainer.innerHTML = rootItems.map(item => `
    <div class="shop-tax-item" data-depth="0" data-id="${item.id}">
      <div class="shop-tax-row">
        <label class="shop-tax-label">
          <input type="checkbox" class="shop-tax-checkbox" data-taxonomy-id="${item.id}" value="${item.id}">
          <span><strong>${escapeHtml(item.name)}</strong></span>
        </label>
        ${tree[item.id] ? `<button type="button" class="shop-tax-toggle" data-taxonomy-toggle="${item.id}" aria-expanded="false" aria-label="Expand ${escapeHtml(item.name)}">+ ${getTaxonomyChildrenCount(item.id, tree)}</button>` : ''}
      </div>
      ${tree[item.id] ? `<div class="shop-tax-children is-collapsed" data-taxonomy-children="${item.id}">${renderTaxonomyLevel(item.id, tree, 1)}</div>` : ''}
    </div>
  `).join('');

  // Load user wishlist and compare
  const wishlistSource = wishlistResult.success && Array.isArray(wishlistResult.data) ? wishlistResult.data : [];
  const compareSource = compareResult.success && Array.isArray(compareResult.data) ? compareResult.data : [];
  const wishlistIds = new Set(wishlistSource.map(item => String(item).trim()).filter(Boolean));
  const compareIds = new Set(compareSource.map(item => String(item).trim()).filter(Boolean));

  // Filter state
  const filterState = {
    taxonomyIds: [],
    minPrice: 0,
    maxPrice: 100000,
    availability: 'all',
    sort: 'newest'
  };

  // Load and render products
  const loadProducts = async () => {
    const result = await getProductsCatalogAdvanced({
      taxonomyIds: filterState.taxonomyIds.length > 0 ? filterState.taxonomyIds : undefined,
      minPrice: filterState.minPrice,
      maxPrice: filterState.maxPrice,
      availability: filterState.availability,
      sort: filterState.sort,
      limit: 240
    });

    const products = result.success && Array.isArray(result.data) ? result.data : [];

    if (result.success && !Array.isArray(result.data) && cloudflareConfig.apiBaseUrl) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-triangle-exclamation" style="font-size: 2.5rem; color: var(--text-secondary); margin-bottom: 1rem; display: block;"></i>
          <h3>Unexpected backend response</h3>
          <p style="color: var(--text-secondary);">Shop API returned an invalid payload format. Please verify that /api/products returns a JSON array in data.</p>
        </div>
      `;
      resultsCount.textContent = 'Backend response invalid';
      return;
    }

    if (!result.success && cloudflareConfig.apiBaseUrl) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-triangle-exclamation" style="font-size: 2.5rem; color: var(--text-secondary); margin-bottom: 1rem; display: block;"></i>
          <h3>Backend connection error</h3>
          <p style="color: var(--text-secondary);">Could not fetch shop products from Worker API. Check env API URL and Worker logs.</p>
        </div>
      `;
      resultsCount.textContent = 'Backend unavailable';
      return;
    }

    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-box-open" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem; display: block;"></i>
          <h3>No products found</h3>
          <p style="color: var(--text-secondary);">Try adjusting your filters or check back later.</p>
        </div>
      `;
      resultsCount.textContent = '0 products found';
      return;
    }

    resultsCount.textContent = `${products.length} product${products.length === 1 ? '' : 's'} found`;
    grid.innerHTML = products.map(product => renderProductCard(
      product,
      wishlistIds.has(product.id),
      compareIds.has(product.id)
    )).join('');
    initLazyLoading();

    // Attach action handlers
    attachHandlers();
    window.dispatchEvent(new CustomEvent('catalogHydrated', { detail: { products } }));
  };

  // Attach event handlers to buttons
  const attachHandlers = () => {
    document.querySelectorAll('[data-action="wishlist"]').forEach(btn => {
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
          alert('Please login to add items to your wishlist');
        }
      });
    });

    document.querySelectorAll('[data-action="compare"]').forEach(btn => {
      btn.addEventListener('click', async event => {
        event.preventDefault();
        const productId = String(btn.getAttribute('data-product-id') || '').trim();
        if (!productId) {
          return;
        }
        const result = await toggleCompareProductSync(productId);

        if (result.success) {
          if (result.active) {
            compareIds.add(productId);
            btn.classList.add('is-active');
          } else {
            compareIds.delete(productId);
            btn.classList.remove('is-active');
          }
        } else if (result.error && result.error.includes('limit')) {
          alert('You can compare up to 4 products');
        } else if (result.error === 'Please login first') {
          alert('Please login to compare products');
        }
      });
    });
  };

  // Filter handlers
  const updateFilters = () => {
    filterState.taxonomyIds = Array.from(document.querySelectorAll('.shop-tax-checkbox:checked')).map(
      cb => String(cb.getAttribute('data-taxonomy-id') || '').trim()
    ).filter(Boolean);
    filterState.minPrice = Number(minPriceInput.value) || 0;
    filterState.maxPrice = Number(maxPriceInput.value) || 100000;
    filterState.availability = availabilitySelect.value || 'all';
    filterState.sort = sortSelect.value || 'newest';
    updatePriceDisplay();
    if (categorySummary) {
      const labels = Array.from(document.querySelectorAll('.shop-tax-checkbox:checked'))
        .map(cb => cb.closest('.shop-tax-label')?.textContent?.trim())
        .filter(Boolean);
      categorySummary.textContent = labels.length > 0 ? labels.slice(0, 3).join(', ') + (labels.length > 3 ? ` +${labels.length - 3}` : '') : 'All categories';
    }
    loadProducts();
  };

  document.querySelectorAll('.shop-tax-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const taxonomyId = btn.getAttribute('data-taxonomy-toggle');
      const children = document.querySelector(`[data-taxonomy-children="${taxonomyId}"]`);
      if (!children) {
        return;
      }

      const isCollapsed = children.classList.toggle('is-collapsed');
      btn.setAttribute('aria-expanded', String(!isCollapsed));
      btn.textContent = isCollapsed ? '+' : '−';
    });
  });

  document.querySelectorAll('.shop-tax-checkbox').forEach(cb => {
    cb.addEventListener('change', updateFilters);
  });

  // Price slider handlers with real-time updates
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

  // Debounce price filter application
  let priceFilterTimeout;
  minPriceInput.addEventListener('change', () => {
    clearTimeout(priceFilterTimeout);
    priceFilterTimeout = setTimeout(() => {
      updateFilters();
    }, 300);
  });

  maxPriceInput.addEventListener('change', () => {
    clearTimeout(priceFilterTimeout);
    priceFilterTimeout = setTimeout(() => {
      updateFilters();
    }, 300);
  });

  availabilitySelect.addEventListener('change', updateFilters);
  sortSelect.addEventListener('change', updateFilters);

  resetBtn.addEventListener('click', () => {
    document.querySelectorAll('.shop-tax-checkbox').forEach(cb => {
      cb.checked = false;
    });
    minPriceInput.value = '0';
    maxPriceInput.value = '100000';
    availabilitySelect.value = 'all';
    sortSelect.value = 'newest';
    updatePriceDisplay();
    updateFilters();
  });

  if (clearCategoriesBtn) {
    clearCategoriesBtn.addEventListener('click', () => {
      document.querySelectorAll('.shop-tax-checkbox').forEach(cb => {
        cb.checked = false;
      });
      updateFilters();
    });
  }

  // Initialize price display
  updatePriceDisplay();

  // Subscribe to realtime updates
  let unsubscribe = () => {};
  unsubscribe = subscribeCatalogRealtime(async () => {
    await loadProducts();
  });

  window.addEventListener('hashchange', () => {
    unsubscribe();
  }, { once: true });

  // Load initial products
  await loadProducts();
}
