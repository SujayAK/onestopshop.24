import localProducts from '../data/products.json';
import { INVENTORY_STRUCTURE, getInventoryRowsFromStructure } from '../data/inventory-structure.js';
import { getInventoryTaxonomy, getProductsCatalog } from '../utils/supabase.js';

const FALLBACK_TAXONOMY_ROWS = getInventoryRowsFromStructure(INVENTORY_STRUCTURE);

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function buildTaxonomyMap(rows = []) {
  const map = {};

  rows.forEach(row => {
    const category = String(row?.category || '').trim();
    const subcategory = String(row?.subcategory || '').trim();

    if (!category || !subcategory) {
      return;
    }

    if (!map[category]) {
      map[category] = [];
    }

    if (!map[category].includes(subcategory)) {
      map[category].push(subcategory);
    }
  });

  return map;
}

function getTaxonomyMapFromProducts(products = []) {
  const rows = products
    .map(product => ({
      category: product?.category,
      subcategory: product?.subcategory
    }))
    .filter(row => row.category && row.subcategory);

  return buildTaxonomyMap(rows);
}

function getMergedTaxonomyMap() {
  const fromFallback = buildTaxonomyMap(FALLBACK_TAXONOMY_ROWS);
  const fromProducts = getTaxonomyMapFromProducts(localProducts);

  const merged = { ...fromFallback };

  Object.entries(fromProducts).forEach(([category, subcategories]) => {
    const existing = new Set(merged[category] || []);
    subcategories.forEach(item => existing.add(item));
    merged[category] = [...existing];
  });

  return merged;
}

function normalizeCategoryValue(selectedCategory, taxonomyMap) {
  const normalized = normalizeValue(selectedCategory);
  if (normalized === 'all' || !normalized) {
    return 'all';
  }

  const matchedCategory = Object.keys(taxonomyMap)
    .find(category => normalizeValue(category) === normalized);

  return matchedCategory || 'all';
}

function normalizeSubcategoryValue(selectedSubcategory, category, taxonomyMap) {
  const normalized = normalizeValue(selectedSubcategory);
  if (normalized === 'all' || !normalized || category === 'all') {
    return 'all';
  }

  const subcategories = taxonomyMap[category] || [];
  const matchedSubcategory = subcategories
    .find(subcategory => normalizeValue(subcategory) === normalized);

  return matchedSubcategory || 'all';
}

function renderCategoryOptions(categoryValue, taxonomyMap) {
  const categories = Object.keys(taxonomyMap);

  return ['all', ...categories]
    .map(category => {
      const selected = categoryValue === category ? 'selected' : '';
      const label = category === 'all' ? 'All Categories' : category;
      return `<option value="${escapeHtml(category)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function renderSubcategoryOptions(categoryValue, subcategoryValue, taxonomyMap) {
  if (categoryValue === 'all') {
    return '<option value="all" selected>All Subcategories</option>';
  }

  const subcategories = taxonomyMap[categoryValue] || [];

  return ['all', ...subcategories]
    .map(subcategory => {
      const selected = subcategoryValue === subcategory ? 'selected' : '';
      const label = subcategory === 'all' ? 'All Subcategories' : subcategory;
      return `<option value="${escapeHtml(subcategory)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function normalizeProduct(row) {
  return {
    id: Number(row.id),
    name: row.name || 'Product',
    price: Number(row.price || 0),
    category: row.category || 'General',
    subcategory: row.subcategory || '',
    image: row.image || row.image_url || 'https://via.placeholder.com/600x600?text=Product',
    description: row.description || '',
    stock: Number.isFinite(Number(row.stock)) ? Number(row.stock) : null
  };
}

function renderProductCard(product) {
  return `
    <div class="product-card" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}" class="product-image">
      <p style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">${product.category}${product.subcategory ? ` / ${product.subcategory}` : ''}</p>
      <h3>${product.name}</h3>
      <p style="font-weight: 700; color: var(--accent-pink);">Rs ${product.price.toFixed(2)}</p>
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
    sub: params.get('sub') || 'all',
    sort: params.get('sort') || 'newest',
    min: params.get('min') || '',
    max: params.get('max') || ''
  };
}

function updateShopHash(next) {
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.cat && next.cat !== 'all') params.set('cat', next.cat);
  if (next.sub && next.sub !== 'all' && next.cat && next.cat !== 'all') params.set('sub', next.sub);
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
    const matchesSubcategory = filters.sub === 'all' || product.subcategory === filters.sub;
    const matchesSearch = !filters.q
      || product.name.toLowerCase().includes(filters.q.toLowerCase())
      || product.description.toLowerCase().includes(filters.q.toLowerCase());
    const matchesMin = !Number.isFinite(minValue) || product.price >= minValue;
    const matchesMax = !Number.isFinite(maxValue) || product.price <= maxValue;
    return matchesCategory && matchesSubcategory && matchesSearch && matchesMin && matchesMax;
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
  const rawFilters = parseShopQuery();
  const taxonomyMap = getMergedTaxonomyMap();
  const categoryValue = normalizeCategoryValue(rawFilters.cat, taxonomyMap);
  const subcategoryValue = normalizeSubcategoryValue(rawFilters.sub, categoryValue, taxonomyMap);
  const categoryOptions = renderCategoryOptions(categoryValue, taxonomyMap);
  const subcategoryOptions = renderSubcategoryOptions(categoryValue, subcategoryValue, taxonomyMap);

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' }
  ]
    .map(option => `<option value="${option.value}" ${rawFilters.sort === option.value ? 'selected' : ''}>${option.label}</option>`)
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

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; align-items: end; margin-bottom: 2rem;">
        <div>
          <label for="shop-search" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Search</label>
          <input id="shop-search" type="text" value="${rawFilters.q}" placeholder="Search products" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
        </div>

        <div>
          <label for="shop-category" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Category</label>
          <select id="shop-category" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
            ${categoryOptions}
          </select>
        </div>

        <div>
          <label for="shop-subcategory" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Subcategory</label>
          <select id="shop-subcategory" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;" ${categoryValue === 'all' ? 'disabled' : ''}>
            ${subcategoryOptions}
          </select>
        </div>

        <div>
          <label for="shop-min-price" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Min Price</label>
          <input id="shop-min-price" type="number" min="0" step="1" value="${rawFilters.min}" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
        </div>

        <div>
          <label for="shop-max-price" style="display: block; margin-bottom: 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Max Price</label>
          <input id="shop-max-price" type="number" min="0" step="1" value="${rawFilters.max}" placeholder="20000" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
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
  const fallbackTaxonomyMap = getMergedTaxonomyMap();
  const taxonomyResult = await getInventoryTaxonomy();
  const taxonomyMap = taxonomyResult.success && taxonomyResult.data.length > 0
    ? buildTaxonomyMap(taxonomyResult.data)
    : fallbackTaxonomyMap;

  const normalizedCategory = normalizeCategoryValue(filters.cat, taxonomyMap);
  const normalizedSubcategory = normalizeSubcategoryValue(filters.sub, normalizedCategory, taxonomyMap);

  const searchInput = document.getElementById('shop-search');
  const categorySelect = document.getElementById('shop-category');
  const subcategorySelect = document.getElementById('shop-subcategory');
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

  if (categorySelect) {
    categorySelect.innerHTML = renderCategoryOptions(normalizedCategory, taxonomyMap);
  }

  if (subcategorySelect) {
    subcategorySelect.innerHTML = renderSubcategoryOptions(normalizedCategory, normalizedSubcategory, taxonomyMap);
    subcategorySelect.disabled = normalizedCategory === 'all';
  }

  const refreshSubcategorySelect = () => {
    if (!categorySelect || !subcategorySelect) {
      return;
    }

    const categoryValue = normalizeCategoryValue(categorySelect.value, taxonomyMap);
    const currentSubcategory = normalizeSubcategoryValue(subcategorySelect.value, categoryValue, taxonomyMap);

    subcategorySelect.innerHTML = renderSubcategoryOptions(categoryValue, currentSubcategory, taxonomyMap);
    subcategorySelect.disabled = categoryValue === 'all';
  };

  const applyCurrentFilters = () => {
    const currentCategory = normalizeCategoryValue(categorySelect?.value || 'all', taxonomyMap);
    const currentSubcategory = normalizeSubcategoryValue(subcategorySelect?.value || 'all', currentCategory, taxonomyMap);

    updateShopHash({
      q: searchInput?.value.trim() || '',
      cat: currentCategory,
      sub: currentSubcategory,
      sort: sortSelect?.value || 'newest',
      min: minPriceInput?.value || '',
      max: maxPriceInput?.value || ''
    });
  };

  applyButton?.addEventListener('click', applyCurrentFilters);
  clearButton?.addEventListener('click', () => updateShopHash({ q: '', cat: 'all', sub: 'all', sort: 'newest', min: '', max: '' }));
  categorySelect?.addEventListener('change', () => {
    refreshSubcategorySelect();
    applyCurrentFilters();
  });
  subcategorySelect?.addEventListener('change', applyCurrentFilters);
  sortSelect?.addEventListener('change', applyCurrentFilters);
  searchInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      applyCurrentFilters();
    }
  });

  const catalogResult = await getProductsCatalog({
    limit: 120,
    category: normalizedCategory !== 'all' ? normalizedCategory : undefined,
    subcategory: normalizedSubcategory !== 'all' ? normalizedSubcategory : undefined,
    search: filters.q || undefined,
    minPrice: filters.min || undefined,
    maxPrice: filters.max || undefined,
    sort: filters.sort || 'newest'
  });

  const products = catalogResult.success
    ? (catalogResult.data || []).map(normalizeProduct)
    : getLocalFilteredProducts({
      ...filters,
      cat: normalizedCategory,
      sub: normalizedSubcategory
    });

  resultsMeta.textContent = `${products.length} product${products.length === 1 ? '' : 's'} found`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="profile-empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-search"></i>
        <h3>No products match your filters</h3>
        <p>Try adjusting category, subcategory, search, or price range.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(renderProductCard).join('');
  window.dispatchEvent(new CustomEvent('catalogHydrated', { detail: { products } }));
}
