import localProducts from '../data/products.json';
import { INVENTORY_STRUCTURE, getInventoryRowsFromStructure } from '../data/inventory-structure.js';
import { getInventoryTaxonomy, getProductsCatalog } from '../utils/supabase.js';

const FALLBACK_TAXONOMY_ROWS = getInventoryRowsFromStructure(INVENTORY_STRUCTURE);
const CATEGORY_ORDER = ['Bags', 'Accessories'];

const SUBCATEGORY_IMAGES = {
  Bags: {
    'Shoulder Bags': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900',
    'Tote Bags': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=900',
    'Sling Bags': 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=900',
    'Ethnic Bags': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=900',
    'Duffle Bags': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=900',
    Wallets: 'https://images.unsplash.com/photo-1627123834957-4466880c0d94?q=80&w=900',
    'Tablet Bags': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=900'
  },
  Accessories: {
    'Hair Bows': 'https://images.unsplash.com/photo-1609932113189-6890e1797371?q=80&w=900',
    Nails: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=900',
    Earrings: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=900',
    Bracelets: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?q=80&w=900',
    Necklace: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=900',
    'Bag Charms': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=900',
    Sunglasses: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=900',
    'Hair Claw Clips': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=900',
    Scarfs: 'https://images.unsplash.com/photo-1584030373081-f37b7bb4fa8e?q=80&w=900',
    'Phone Covers': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=900',
    'Travel Pouch': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=900'
  }
};

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

  CATEGORY_ORDER.forEach(category => {
    if (!merged[category]) {
      merged[category] = [];
    }
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

function getSubcategoryImage(category, subcategory) {
  return SUBCATEGORY_IMAGES?.[category]?.[subcategory]
    || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=900';
}

function getSectionTitle(category) {
  return category === 'Bags' ? 'Shop Bags' : 'Shop Accessories';
}

function getViewAllLabel(category) {
  return category === 'Bags' ? 'View All Bags' : 'View All Accessories';
}

function parseShopQuery() {
  const hash = window.location.hash || '#/shop';
  const queryString = hash.includes('?') ? hash.split('?')[1] : '';
  const params = new URLSearchParams(queryString);

  return {
    cat: params.get('cat') || 'all',
    sub: params.get('sub') || 'all'
  };
}

function buildShopHash(cat = 'all', sub = 'all') {
  const params = new URLSearchParams();
  if (cat && cat !== 'all') {
    params.set('cat', cat);
  }
  if (sub && sub !== 'all' && cat && cat !== 'all') {
    params.set('sub', sub);
  }

  const query = params.toString();
  return query ? `#/shop?${query}` : '#/shop';
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
      <img src="${product.image}" alt="${escapeHtml(product.name)}" class="product-image">
      <p style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(product.category)}${product.subcategory ? ` / ${escapeHtml(product.subcategory)}` : ''}</p>
      <h3>${escapeHtml(product.name)}</h3>
      <p style="font-weight: 700; color: var(--accent-pink);">Rs ${product.price.toFixed(2)}</p>
      <p class="stock-indicator" data-stock-label data-product-id="${product.id}" style="margin-bottom: 0.5rem;">Checking stock...</p>
      <button class="btn add-to-cart-btn" data-product-id="${product.id}" data-default-label="Add to Cart" style="margin-top: 0.75rem; width: 100%;">Add to Cart</button>
      <button class="btn btn-outline wishlist-toggle" data-product-id="${product.id}" style="margin-top: 0.75rem; width: 100%;">Add to Wishlist</button>
      <a href="#/product/${product.id}" class="btn btn-outline" style="margin-top: 1rem; width: 100%;">View Details</a>
    </div>
  `;
}

function renderSubcategoryCard(category, subcategory, isActive) {
  const href = buildShopHash(category, subcategory);
  const image = getSubcategoryImage(category, subcategory);

  return `
    <a href="${href}" class="shop-subcat-card${isActive ? ' is-active' : ''}" style="background-image: linear-gradient(180deg, rgba(0,0,0,0.1) 10%, rgba(0,0,0,0.6) 100%), url('${image}');">
      <span class="shop-subcat-name">${escapeHtml(subcategory)}</span>
      <span class="shop-subcat-link">Explore</span>
    </a>
  `;
}

function renderDiscoverySection(category, subcategories, activeCategory, activeSubcategory) {
  const cards = subcategories
    .map(subcategory => renderSubcategoryCard(
      category,
      subcategory,
      activeCategory === category && activeSubcategory === subcategory
    ))
    .join('');

  return `
    <section class="shop-discovery-block">
      <div class="shop-discovery-header">
        <h2 class="shop-discovery-title">${getSectionTitle(category)}</h2>
      </div>
      <div class="shop-subcat-grid">${cards}</div>
      <a href="${buildShopHash(category, 'all')}" class="btn shop-view-all-btn">${getViewAllLabel(category)}</a>
    </section>
  `;
}

function renderDiscoverySections(taxonomyMap, activeCategory, activeSubcategory) {
  return CATEGORY_ORDER
    .map(category => renderDiscoverySection(
      category,
      taxonomyMap[category] || [],
      activeCategory,
      activeSubcategory
    ))
    .join('');
}

function getLocalFilteredProducts(filters) {
  const normalized = localProducts.map(normalizeProduct);

  return normalized
    .filter(product => (filters.cat === 'all' || product.category === filters.cat)
      && (filters.sub === 'all' || product.subcategory === filters.sub))
    .sort((a, b) => b.id - a.id);
}

function getSelectionTitle(cat, sub) {
  if (cat === 'all') {
    return 'All Products';
  }
  if (sub === 'all') {
    return `${cat} Collection`;
  }
  return `${cat} / ${sub}`;
}

export function ShopPage() {
  const rawFilters = parseShopQuery();
  const taxonomyMap = getMergedTaxonomyMap();
  const categoryValue = normalizeCategoryValue(rawFilters.cat, taxonomyMap);
  const subcategoryValue = normalizeSubcategoryValue(rawFilters.sub, categoryValue, taxonomyMap);

  return `
    <div class="container section">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <span>Shop</span>
      </div>

      <div class="shop-discovery-shell" id="shop-discovery-sections">
        ${renderDiscoverySections(taxonomyMap, categoryValue, subcategoryValue)}
      </div>

      <div class="shop-results-shell">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <h2 id="shop-selection-title" style="margin-bottom: 0;">${escapeHtml(getSelectionTitle(categoryValue, subcategoryValue))}</h2>
          <p id="shop-results-meta" style="color: var(--text-secondary); margin-bottom: 0;">Loading products...</p>
        </div>

        <div id="shop-products-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem;">
          <div class="profile-loading" style="grid-column: 1 / -1;">Loading products...</div>
        </div>
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
  const normalizedHash = buildShopHash(normalizedCategory, normalizedSubcategory);

  if (window.location.hash !== normalizedHash) {
    window.location.hash = normalizedHash;
    return;
  }

  const discoveryContainer = document.getElementById('shop-discovery-sections');
  const selectionTitle = document.getElementById('shop-selection-title');
  const resultsMeta = document.getElementById('shop-results-meta');
  const grid = document.getElementById('shop-products-grid');

  if (!grid || !resultsMeta || !discoveryContainer || !selectionTitle) {
    return;
  }

  discoveryContainer.innerHTML = renderDiscoverySections(taxonomyMap, normalizedCategory, normalizedSubcategory);
  selectionTitle.textContent = getSelectionTitle(normalizedCategory, normalizedSubcategory);

  const catalogResult = await getProductsCatalog({
    limit: 240,
    category: normalizedCategory !== 'all' ? normalizedCategory : undefined,
    subcategory: normalizedSubcategory !== 'all' ? normalizedSubcategory : undefined,
    sort: 'newest'
  });

  const products = catalogResult.success
    ? (catalogResult.data || []).map(normalizeProduct)
    : getLocalFilteredProducts({ cat: normalizedCategory, sub: normalizedSubcategory });

  resultsMeta.textContent = `${products.length} product${products.length === 1 ? '' : 's'} found`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="profile-empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-bag-shopping"></i>
        <h3>No products in this section yet</h3>
        <p>Please add inventory for this sub-category in Supabase.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(renderProductCard).join('');
  window.dispatchEvent(new CustomEvent('catalogHydrated', { detail: { products } }));
}
