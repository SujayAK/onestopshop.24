import {
  getStockClearanceProducts,
  getStockClearanceCategories,
  getUserWishlist,
  getUserCompare,
  toggleWishlistProductSync,
  toggleCompareProductSync,
  cloudflareConfig
} from '../utils/cloudflare.js';
import { cart } from '../utils/cart.js';
import { getProductImageAttrs, initLazyLoading } from '../utils/image-optimization.js';

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
  
  // Format size info
  const sizeDisplay = product.sizes || product.size ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0 0;"><strong>Size:</strong> ${escapeHtml(String(product.sizes || product.size))}</p>` : '';

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
        <p style="font-size: 0.75rem; color: var(--accent-pink); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 0.5rem;">${escapeHtml(product.category || 'Clearance')}</p>
        <h3 class="shop-card-title">${escapeHtml(product.name)}</h3>
        <p class="shop-card-price">${formatINR(product.price)}</p>
        ${colorSwatches ? `<div class="shop-card-colors">${colorSwatches}</div>` : ''}
        ${sizeDisplay}
        <span class="shop-stock-badge ${stock.css}">${stock.text}</span>
        <div class="shop-card-buttons">
          <button class="btn btn-sm add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
          <a href="#/product/${product.id}" class="btn btn-sm btn-outline">Details</a>
        </div>
      </div>
    </div>
  `;
}

export function StockClearancePage() {
  return `
    <div class="container section">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <span>Stock Clearance Sale</span>
      </div>

      <div style="text-align: center; margin-bottom: 3rem;">
        <p style="font-size: 0.9rem; color: var(--accent-pink); text-transform: uppercase; letter-spacing: 2px; font-weight: 600; margin-bottom: 0.5rem;">LIMITED TIME OFFER</p>
        <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; background: linear-gradient(135deg, var(--accent-pink), var(--accent-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">🔥 STOCK CLEARANCE SALE 🔥</h1>
        <p style="font-size: 1rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto;">Massive discounts on selected items. Hurry before they're gone!</p>
      </div>

      <div class="shop-layout">
        <aside class="shop-sidebar">
          <div class="shop-filter-section">
            <h3>Category</h3>
            <div id="clearance-categories" class="shop-filter-options">
              <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;">
                <input type="radio" name="clearance-category" value="" checked data-category="">
                <span>All Categories</span>
              </label>
              <!-- Categories will be loaded here -->
            </div>
          </div>

          <div class="shop-filter-section">
            <h3>Price Range</h3>
            <div class="price-range-container">
              <div class="price-slider-wrapper">
                <input type="range" id="clearance-min-price" class="price-slider price-slider-min" min="0" max="100000" value="0" step="100">
                <input type="range" id="clearance-max-price" class="price-slider price-slider-max" min="0" max="100000" value="100000" step="100">
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
            <h3>Sort By</h3>
            <select id="clearance-sort" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); font-family: inherit;">
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>

          <button id="clearance-reset-filters" class="btn btn-outline" style="width: 100%; margin-top: 1rem;">Reset Filters</button>
        </aside>

        <main class="shop-main">
          <div class="shop-toolbar">
            <p id="clearance-results-count">Loading products...</p>
          </div>

          <div id="clearance-grid" class="shop-grid">
            <div class="profile-loading">Loading stock clearance products...</div>
          </div>
        </main>
      </div>
    </div>
  `;
}

export async function initStockClearancePage() {
  const categoriesContainer = document.getElementById('clearance-categories');
  const minPriceInput = document.getElementById('clearance-min-price');
  const maxPriceInput = document.getElementById('clearance-max-price');
  const minPriceDisplay = document.querySelector('.price-min-display');
  const maxPriceDisplay = document.querySelector('.price-max-display');
  const priceSliderFill = document.querySelector('.price-slider-fill');
  const sortSelect = document.getElementById('clearance-sort');
  const resetBtn = document.getElementById('clearance-reset-filters');
  const grid = document.getElementById('clearance-grid');
  const resultsCount = document.getElementById('clearance-results-count');

  if (!grid) {
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

  // Load categories
  const categoriesResult = await getStockClearanceCategories();
  if (!categoriesResult.success && cloudflareConfig.apiBaseUrl) {
    categoriesContainer.innerHTML = `
      <p style="color: var(--text-secondary); margin: 0;">Failed to load categories from backend.</p>
    `;
  }
  const categories = categoriesResult.success ? categoriesResult.data : [];
  
  if (categories.length > 0) {
    const categoryOptions = categories
      .map(cat => `
        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;">
          <input type="radio" name="clearance-category" value="${escapeHtml(cat)}" data-category="${escapeHtml(cat)}">
          <span>${escapeHtml(cat)}</span>
        </label>
      `)
      .join('');
    
    categoriesContainer.innerHTML = `
      <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;">
        <input type="radio" name="clearance-category" value="" checked data-category="">
        <span><strong>All Categories</strong></span>
      </label>
      ${categoryOptions}
    `;
  }

  // Load user wishlist and compare
  const wishlistResult = await getUserWishlist();
  const compareResult = await getUserCompare();
  const wishlistIds = new Set((wishlistResult.success ? wishlistResult.data : []).map(item => String(item).trim()).filter(Boolean));
  const compareIds = new Set((compareResult.success ? compareResult.data : []).map(item => String(item).trim()).filter(Boolean));

  // Filter state
  const filterState = {
    category: '',
    minPrice: 0,
    maxPrice: 100000,
    sort: 'newest'
  };

  // Load and render products
  const loadProducts = async () => {
    const result = await getStockClearanceProducts({
      category: filterState.category || undefined,
      minPrice: filterState.minPrice,
      maxPrice: filterState.maxPrice,
      sort: filterState.sort,
      limit: 240
    });

    const products = result.success ? result.data : [];

    if (!result.success && cloudflareConfig.apiBaseUrl) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-triangle-exclamation" style="font-size: 2.5rem; color: var(--text-secondary); margin-bottom: 1rem; display: block;"></i>
          <h3>Backend connection error</h3>
          <p style="color: var(--text-secondary);">Could not fetch stock clearance products from Worker API. Check env API URL and Worker logs.</p>
        </div>
      `;
      resultsCount.textContent = 'Backend unavailable';
      return;
    }

    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-box-open" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem; display: block;"></i>
          <h3>No clearance products found</h3>
          <p style="color: var(--text-secondary);">Try adjusting your filters or check back later for more deals!</p>
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
    const selectedCategory = document.querySelector('input[name="clearance-category"]:checked');
    filterState.category = selectedCategory ? selectedCategory.value : '';
    filterState.minPrice = Number(minPriceInput.value) || 0;
    filterState.maxPrice = Number(maxPriceInput.value) || 100000;
    filterState.sort = sortSelect.value || 'newest';
    updatePriceDisplay();
    loadProducts();
  };

  // Add event listeners for category buttons
  document.querySelectorAll('input[name="clearance-category"]').forEach(radio => {
    radio.addEventListener('change', updateFilters);
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

  sortSelect.addEventListener('change', updateFilters);

  resetBtn.addEventListener('click', () => {
    document.querySelector('input[name="clearance-category"][value=""]').checked = true;
    minPriceInput.value = '0';
    maxPriceInput.value = '100000';
    sortSelect.value = 'newest';
    updatePriceDisplay();
    updateFilters();
  });

  // Initialize price display
  updatePriceDisplay();

  // Load initial products
  await loadProducts();
}
