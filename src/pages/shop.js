import {
  getTaxonomyTree,
  getProductsCatalogAdvanced,
  getUserWishlist,
  getUserCompare,
  toggleWishlistProductSync,
  toggleCompareProductSync,
  subscribeCatalogRealtime
} from '../utils/supabase.js';
import { cart } from '../utils/cart.js';

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

function renderTaxonomyLevel(parentId, tree, depth = 0) {
  const items = tree[parentId] || [];
  if (items.length === 0) return '';

  return items.map(item => `
    <div class="shop-tax-item" data-depth="${depth}" data-id="${item.id}">
      <label class="shop-tax-label">
        <input type="checkbox" class="shop-tax-checkbox" data-taxonomy-id="${item.id}" value="${item.id}">
        <span>${escapeHtml(item.name)}</span>
      </label>
      ${tree[item.id] ? renderTaxonomyLevel(item.id, tree, depth + 1) : ''}
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
  const colorSwatches = colors
    .map(c => `<span class="shop-color-dot" style="background:${escapeHtml(c.hex)}" title="${escapeHtml(c.name)}"></span>`)
    .join('');

  return `
    <div class="shop-product-card" data-product-id="${product.id}">
      <div class="shop-card-image">
        <img src="${product.image_url || product.image || 'https://via.placeholder.com/300x350?text=Images+Coming+Soon'}" alt="${escapeHtml(product.name)}">
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
            <div id="shop-taxonomy" class="shop-taxonomy-tree"></div>
          </div>

          <div class="shop-filter-section">
            <h3>Price</h3>
            <div class="shop-price-range">
              <label>Min: <input type="number" id="shop-min-price" min="0" step="10" value="0"></label>
              <label>Max: <input type="number" id="shop-max-price" min="0" step="10" value="10000000"></label>
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
  const availabilitySelect = document.getElementById('shop-availability');
  const sortSelect = document.getElementById('shop-sort');
  const resetBtn = document.getElementById('shop-reset-filters');
  const grid = document.getElementById('shop-grid');
  const resultsCount = document.getElementById('shop-results-count');

  if (!grid || !taxonomyContainer) {
    return;
  }

  // Load taxonomy
  const taxonomyResult = await getTaxonomyTree();
  const taxonomyRows = taxonomyResult.success ? taxonomyResult.data : [];
  const tree = buildTaxonomyTree(taxonomyRows);

  // Render root level (depth 1)
  const rootItems = taxonomyRows.filter(row => row.depth === 1);
  taxonomyContainer.innerHTML = rootItems.map(item => `
    <div class="shop-tax-item" data-depth="0" data-id="${item.id}">
      <label class="shop-tax-label">
        <input type="checkbox" class="shop-tax-checkbox" data-taxonomy-id="${item.id}" value="${item.id}">
        <span><strong>${escapeHtml(item.name)}</strong></span>
      </label>
      ${renderTaxonomyLevel(item.id, tree, 1)}
    </div>
  `).join('');

  // Load user wishlist and compare
  const wishlistResult = await getUserWishlist();
  const compareResult = await getUserCompare();
  const wishlistIds = new Set(wishlistResult.success ? wishlistResult.data : []);
  const compareIds = new Set(compareResult.success ? compareResult.data : []);

  // Filter state
  const filterState = {
    taxonomyIds: [],
    minPrice: 0,
    maxPrice: 10000000,
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

    const products = result.success ? result.data : [];

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

    // Attach action handlers
    attachHandlers();
    window.dispatchEvent(new CustomEvent('catalogHydrated', { detail: { products } }));
  };

  // Attach event handlers to buttons
  const attachHandlers = () => {
    document.querySelectorAll('[data-action="wishlist"]').forEach(btn => {
      btn.addEventListener('click', async event => {
        event.preventDefault();
        const productId = Number(btn.getAttribute('data-product-id'));
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
        const productId = Number(btn.getAttribute('data-product-id'));
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
      cb => Number(cb.getAttribute('data-taxonomy-id'))
    );
    filterState.minPrice = Number(minPriceInput.value) || 0;
    filterState.maxPrice = Number(maxPriceInput.value) || 10000000;
    filterState.availability = availabilitySelect.value || 'all';
    filterState.sort = sortSelect.value || 'newest';
    loadProducts();
  };

  document.querySelectorAll('.shop-tax-checkbox').forEach(cb => {
    cb.addEventListener('change', updateFilters);
  });

  minPriceInput.addEventListener('change', updateFilters);
  maxPriceInput.addEventListener('change', updateFilters);
  availabilitySelect.addEventListener('change', updateFilters);
  sortSelect.addEventListener('change', updateFilters);

  resetBtn.addEventListener('click', () => {
    document.querySelectorAll('.shop-tax-checkbox').forEach(cb => {
      cb.checked = false;
    });
    minPriceInput.value = '0';
    maxPriceInput.value = '10000000';
    availabilitySelect.value = 'all';
    sortSelect.value = 'newest';
    updateFilters();
  });

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
