import localProducts from '../data/products.json';
import { getProductsCatalog } from '../utils/supabase.js';

function normalizeProduct(row) {
  return {
    id: Number(row.id),
    name: row.name || 'Product',
    price: Number(row.price || 0),
    category: row.category || 'General',
    image: row.image || row.image_url || 'https://via.placeholder.com/600x600?text=Product',
    description: row.description || '',
    stock: Number.isFinite(Number(row.stock)) ? Number(row.stock) : null
  };
}

function renderProductCard(product) {
  return `
    <div class="product-card" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}" class="product-image">
      <p style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">${product.category}</p>
      <h3>${product.name}</h3>
      <p style="font-weight: 700; color: var(--accent-pink);">₹${product.price.toFixed(2)}</p>
      <p class="stock-indicator" data-stock-label data-product-id="${product.id}" style="margin-bottom: 0.5rem;">Checking stock...</p>
      <button class="btn add-to-cart-btn" data-product-id="${product.id}" data-default-label="Add to Cart" style="margin-top: 0.75rem; width: 100%;">Add to Cart</button>
      <button class="btn btn-outline wishlist-toggle" data-product-id="${product.id}" style="margin-top: 0.75rem; width: 100%;">Add to Wishlist</button>
      <a href="#/product/${product.id}" class="btn btn-outline" style="margin-top: 1rem; width: 100%;">View Details</a>
    </div>
  `;
}

function parseShopQuery() {
  const hash = window.location.hash || '#/shop';
  const queryString = hash.includes('?') ? hash.split('?')[1] : '';
  const params = new URLSearchParams(queryString);
  return {
    q: params.get('q') || '',
    cat: params.get('cat') || 'all',
    sort: params.get('sort') || 'newest',
    min: params.get('min') || '',
    max: params.get('max') || ''
  };
}

function updateShopHash(next) {
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.cat && next.cat !== 'all') params.set('cat', next.cat);
  if (next.sort && next.sort !== 'newest') params.set('sort', next.sort);
  if (next.min) params.set('min', next.min);
  if (next.max) params.set('max', next.max);

  const query = params.toString();
  window.location.hash = query ? `#/shop?${query}` : '#/shop';
}

function getLocalFilteredProducts(filters) {
  const normalized = localProducts.map(normalizeProduct);
  const minValue = Number(filters.min);
  const maxValue = Number(filters.max);

  let filtered = normalized.filter(product => {
    const matchesCategory = filters.cat === 'all' || product.category === filters.cat;
    const matchesSearch = !filters.q
      || product.name.toLowerCase().includes(filters.q.toLowerCase())
      || product.description.toLowerCase().includes(filters.q.toLowerCase());
    const matchesMin = !Number.isFinite(minValue) || product.price >= minValue;
    const matchesMax = !Number.isFinite(maxValue) || product.price <= maxValue;
    return matchesCategory && matchesSearch && matchesMin && matchesMax;
  });

  if (filters.sort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (filters.sort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (filters.sort === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (filters.sort === 'name-desc') {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  } else {
    filtered.sort((a, b) => b.id - a.id);
  }

  return filtered;
}

export function ShopPage() {
  const filters = parseShopQuery();

  const categories = [...new Set(localProducts.map(product => product.category))];
  const categoryOptions = ['all', ...categories]
    .map(category => {
      const selected = filters.cat === category ? 'selected' : '';
      const label = category === 'all' ? 'All Categories' : category;
      return `<option value="${category}" ${selected}>${label}</option>`;
    })
    .join('');

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' }
  ]
    .map(option => `<option value="${option.value}" ${filters.sort === option.value ? 'selected' : ''}>${option.label}</option>`)
    .join('');

  return `
    <div class="container section">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <span>Shop</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <h1 style="margin-bottom: 0;">Our Collection</h1>
        <p id="shop-results-meta" style="color: var(--text-secondary); margin-bottom: 0;">Loading products...</p>
      </div>

      <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr auto auto; gap: 0.75rem; align-items: end; margin-bottom: 2rem;">
        <div>
          <label for="shop-search" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Search</label>
          <input id="shop-search" type="text" value="${filters.q}" placeholder="Search products" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
        </div>

        <div>
          <label for="shop-category" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Category</label>
          <select id="shop-category" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
            ${categoryOptions}
          </select>
        </div>

        <div>
          <label for="shop-min-price" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Min Price</label>
          <input id="shop-min-price" type="number" min="0" step="1" value="${filters.min}" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
        </div>

        <div>
          <label for="shop-max-price" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Max Price</label>
          <input id="shop-max-price" type="number" min="0" step="1" value="${filters.max}" placeholder="20000" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
        </div>

        <div>
          <label for="shop-sort" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Sort</label>
          <select id="shop-sort" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
            ${sortOptions}
          </select>
        </div>

        <div style="display: flex; gap: 0.5rem;">
          <button id="shop-apply-filters" class="btn" style="padding: 10px 16px;">Apply</button>
          <button id="shop-clear-filters" class="btn btn-outline" style="padding: 10px 16px;">Clear</button>
        </div>
      </div>

      <div id="shop-products-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 3rem;">
        <div class="profile-loading" style="grid-column: 1 / -1;">Loading products...</div>
      </div>
    </div>
  `;
}

export async function initShopPage() {
  const filters = parseShopQuery();
  const searchInput = document.getElementById('shop-search');
  const categorySelect = document.getElementById('shop-category');
  const minPriceInput = document.getElementById('shop-min-price');
  const maxPriceInput = document.getElementById('shop-max-price');
  const sortSelect = document.getElementById('shop-sort');
  const applyButton = document.getElementById('shop-apply-filters');
  const clearButton = document.getElementById('shop-clear-filters');
  const resultsMeta = document.getElementById('shop-results-meta');
  const grid = document.getElementById('shop-products-grid');

  if (!grid || !resultsMeta) {
    return;
  }

  const applyCurrentFilters = () => {
    updateShopHash({
      q: searchInput?.value.trim() || '',
      cat: categorySelect?.value || 'all',
      sort: sortSelect?.value || 'newest',
      min: minPriceInput?.value || '',
      max: maxPriceInput?.value || ''
    });
  };

  applyButton?.addEventListener('click', applyCurrentFilters);
  clearButton?.addEventListener('click', () => updateShopHash({ q: '', cat: 'all', sort: 'newest', min: '', max: '' }));
  categorySelect?.addEventListener('change', applyCurrentFilters);
  sortSelect?.addEventListener('change', applyCurrentFilters);
  searchInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      applyCurrentFilters();
    }
  });

  const catalogResult = await getProductsCatalog({
    limit: 120,
    category: filters.cat !== 'all' ? filters.cat : undefined,
    search: filters.q || undefined,
    minPrice: filters.min || undefined,
    maxPrice: filters.max || undefined,
    sort: filters.sort || 'newest'
  });

  const products = catalogResult.success
    ? (catalogResult.data || []).map(normalizeProduct)
    : getLocalFilteredProducts(filters);

  resultsMeta.textContent = `${products.length} product${products.length === 1 ? '' : 's'} found`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="profile-empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-search"></i>
        <h3>No products match your filters</h3>
        <p>Try adjusting category, search, or price range.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(renderProductCard).join('');
  window.dispatchEvent(new CustomEvent('catalogHydrated', { detail: { products } }));
}
