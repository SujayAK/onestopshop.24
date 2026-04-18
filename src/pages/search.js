import { getProductsCatalogAdvanced, getUserWishlist } from '../utils/cloudflare.js';
import { getProductImageAttrs, initLazyLoading, toThumbnailUrl } from '../utils/image-optimization.js';

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function normalizeProduct(row) {
  return {
    id: String(row.id || '').trim(),
    name: row.name || 'Product',
    category: row.category || 'General',
    subcategory: row.subcategory || '',
    price: Number(row.price || 0),
    image: row.image || row.image_url || 'https://placehold.co/800x1000?text=Product',
    description: row.description || '',
    variants: row.variants,
    colors: row.colors
  };
}

function getProductColors(product) {
  const colors = Array.isArray(product.colors) ? product.colors : [];
  return colors.slice(0, 4).map(color => ({
    name: typeof color === 'string' ? color : color?.name || color?.hex || 'Color',
    hex: typeof color === 'string' ? color : color?.hex || '#d9c7d2'
  }));
}

function getProductImagePair(product) {
  const primary = getProductImageAttrs(toThumbnailUrl(product.image), {
    desktopWidth: 900,
    sizes: '(max-width: 640px) 92vw, (max-width: 980px) 46vw, 24vw',
    aspectRatio: '4:5'
  });

  return {
    primary
  };
}

function renderSearchCard(product, wished = false) {
  const media = getProductImagePair(product);
  const colors = getProductColors(product);

  return `
    <article class="shop-collection-card" data-product-id="${product.id}">
      <div class="shop-collection-media">
        <a href="#/product/${product.id}" class="shop-collection-media-link">
        <img
          class="lazy-image product-image"
          src="${media.primary.placeholder}"
          data-src="${media.primary.src}"
          data-srcset="${media.primary.srcset}"
          sizes="${media.primary.sizes}"
          width="800"
          height="1000"
          alt="${escapeHtml(product.name)}"
          loading="lazy"
          decoding="async"
        >
        </a>
        <button type="button" class="search-wishlist-btn wishlist-toggle${wished ? ' is-active' : ''}" data-product-id="${product.id}">
          ${wished ? 'In Wishlist' : 'Add to Wishlist'}
        </button>
      </div>
      <div class="shop-collection-body">
        <p class="shop-listing-meta">${escapeHtml(product.category || 'General')}${product.subcategory ? ` / ${escapeHtml(product.subcategory)}` : ''}</p>
        <a href="#/product/${product.id}" class="shop-collection-title">${escapeHtml(product.name)}</a>
        <p class="shop-collection-price">${formatINR(product.price)}</p>
        ${colors.length > 0 ? `<div class="shop-collection-swatches">${colors.map(color => `<span style="--swatch:${escapeHtml(color.hex)}" title="${escapeHtml(color.name)}"></span>`).join('')}</div>` : ''}
      </div>
    </article>
  `;
}

export function SearchPage(initialQuery = '') {
  const q = String(initialQuery || '').trim();

  return `
    <section class="section section-compact shop-plp-shell search-page-shell">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <span>Search</span>
      </div>

      <div class="search-page-hero">
        <div>
          <p class="search-page-kicker">Search the Catalog</p>
          <h1>Find products by name, category, or subcategory</h1>
          <p class="search-page-copy">Type a keyword to search the live products table. Results update instantly.</p>
        </div>
        <form class="search-page-form" id="search-form">
          <input
            id="search-input"
            type="search"
            value="${escapeHtml(q)}"
            placeholder="Search handbags, sling, tote, pink..."
            autocomplete="off"
          >
          <button type="submit" class="btn">Search</button>
        </form>
      </div>

      <div class="search-page-meta">
        <div id="search-result-count">${q ? `Searching for “${escapeHtml(q)}”...` : 'Start typing to search products.'}</div>
        <div class="search-page-suggestions">
          <button type="button" class="search-chip" data-search-chip="bags">Bags</button>
          <button type="button" class="search-chip" data-search-chip="shoulder">Shoulder</button>
          <button type="button" class="search-chip" data-search-chip="sling">Sling</button>
          <button type="button" class="search-chip" data-search-chip="tote">Tote</button>
        </div>
      </div>

      <div id="search-results-grid" class="shop-products-grid">
        <div class="profile-loading" style="grid-column: 1 / -1;">Loading search results...</div>
      </div>
    </section>
  `;
}

export async function initSearchPage(initialQuery = '') {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const grid = document.getElementById('search-results-grid');
  const resultCount = document.getElementById('search-result-count');
  const chips = document.querySelectorAll('[data-search-chip]');

  if (!form || !input || !grid || !resultCount) {
    return;
  }

  const wishlistResult = await getUserWishlist();
  let wishlistIds = new Set((wishlistResult.success && Array.isArray(wishlistResult.data) ? wishlistResult.data : []).map(item => String(item).trim()).filter(Boolean));
  let activeQuery = String(initialQuery || input.value || '').trim();
  let searchTimer = null;

  const scoreProduct = (product, query) => {
    const term = String(query || '').trim().toLowerCase();
    if (!term) {
      return 0;
    }

    const name = String(product.name || '').toLowerCase();
    const category = String(product.category || '').toLowerCase();
    const subcategory = String(product.subcategory || '').toLowerCase();
    const description = String(product.description || '').toLowerCase();

    if (name === term) return 100;
    if (name.startsWith(term)) return 80;
    if (subcategory === term) return 70;
    if (category === term) return 60;
    if (name.includes(term)) return 50;
    if (subcategory.includes(term)) return 45;
    if (category.includes(term)) return 40;
    if (description.includes(term)) return 20;
    return 0;
  };

  const fetchResults = async (query) => {
    const term = String(query || '').trim();
    resultCount.textContent = term ? `Searching for “${term}”...` : 'Start typing to search products.';

    if (!term) {
      grid.innerHTML = '<div class="profile-empty-state" style="grid-column: 1 / -1;"><h3>Search your catalog</h3><p>Type at least one word to find products from the live products table.</p></div>';
      return;
    }

    grid.innerHTML = '<div class="profile-loading" style="grid-column: 1 / -1;">Finding products...</div>';

    const result = await getProductsCatalogAdvanced({
      search: term,
      limit: 80,
      sort: 'featured-first',
      prioritizeDisplayOrder: true
    });

    if (!result.success || !Array.isArray(result.data)) {
      grid.innerHTML = '<div class="profile-empty-state" style="grid-column: 1 / -1;"><h3>Search unavailable</h3><p>Could not load products right now. Please try again.</p></div>';
      resultCount.textContent = 'Search unavailable';
      return;
    }

    const products = result.data
      .map(normalizeProduct)
      .sort((left, right) => scoreProduct(right, term) - scoreProduct(left, term) || String(left.name || '').localeCompare(String(right.name || '')));

    if (products.length === 0) {
      grid.innerHTML = '<div class="profile-empty-state" style="grid-column: 1 / -1;"><h3>No products found</h3><p>Try a different keyword, category, or subcategory.</p></div>';
      resultCount.textContent = `0 results for “${term}”`;
      return;
    }

    grid.innerHTML = products.map(product => renderSearchCard(product, wishlistIds.has(product.id))).join('');
    resultCount.textContent = `${products.length} result${products.length === 1 ? '' : 's'} for “${term}”`;

    initLazyLoading();
    window.dispatchEvent(new CustomEvent('catalogHydrated', { detail: { products } }));
  };

  const syncHash = value => {
    const nextHash = value ? `#/search?q=${encodeURIComponent(value)}` : '#/search';
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  };

  const runSearch = (value, updateHash = false) => {
    activeQuery = String(value || '').trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      void fetchResults(activeQuery);
      if (updateHash) {
        syncHash(activeQuery);
      }
    }, 180);
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    runSearch(input.value, true);
  });

  input.addEventListener('input', () => runSearch(input.value));
  input.focus({ preventScroll: true });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const term = String(chip.getAttribute('data-search-chip') || '').trim();
      input.value = term;
      runSearch(term, true);
    });
  });

  if (activeQuery) {
    input.value = activeQuery;
    void fetchResults(activeQuery);
  } else {
    resultCount.textContent = 'Start typing to search products.';
  }
}
