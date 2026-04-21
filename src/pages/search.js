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

const SEARCH_STOP_WORDS = new Set(['for', 'the', 'and', 'with', 'from', 'new', 'all']);

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeQuery(value) {
  const seen = new Set();
  return normalizeSearchText(value)
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 1 && !SEARCH_STOP_WORDS.has(token))
    .filter(token => {
      if (seen.has(token)) {
        return false;
      }
      seen.add(token);
      return true;
    });
}

function levenshteinDistance(left, right, maxDistance = 2) {
  if (left === right) {
    return 0;
  }

  const leftLength = left.length;
  const rightLength = right.length;

  if (!leftLength) {
    return rightLength;
  }
  if (!rightLength) {
    return leftLength;
  }
  if (Math.abs(leftLength - rightLength) > maxDistance) {
    return maxDistance + 1;
  }

  const row = Array.from({ length: rightLength + 1 }, (_, index) => index);

  for (let i = 1; i <= leftLength; i += 1) {
    let prevDiagonal = row[0];
    row[0] = i;
    let bestInRow = row[0];

    for (let j = 1; j <= rightLength; j += 1) {
      const temp = row[j];
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prevDiagonal + cost
      );
      prevDiagonal = temp;
      if (row[j] < bestInRow) {
        bestInRow = row[j];
      }
    }

    if (bestInRow > maxDistance) {
      return maxDistance + 1;
    }
  }

  return row[rightLength];
}

function fuzzyTokenMatch(queryToken, candidateValue) {
  const candidateTokens = normalizeSearchText(candidateValue).split(' ').filter(Boolean);
  return candidateTokens.some(token => {
    const lengthDiff = Math.abs(token.length - queryToken.length);
    if (lengthDiff > 1) {
      return false;
    }
    const threshold = queryToken.length <= 4 ? 1 : 2;
    return levenshteinDistance(queryToken, token, threshold) <= threshold;
  });
}

function scoreAgainstField(term, fieldValue, weight) {
  const field = normalizeSearchText(fieldValue);
  if (!term || !field) {
    return 0;
  }

  if (field === term) {
    return weight * 8;
  }
  if (field.startsWith(term)) {
    return weight * 6;
  }
  if (field.includes(` ${term}`)) {
    return weight * 4;
  }
  if (field.includes(term)) {
    return weight * 3;
  }
  if (term.length >= 3 && fuzzyTokenMatch(term, field)) {
    return weight * 2;
  }
  return 0;
}

function scoreProduct(product, query) {
  const phrase = normalizeSearchText(query);
  const terms = tokenizeQuery(query);

  if (!phrase || terms.length === 0) {
    return 0;
  }

  const colors = getProductColors(product).map(color => color.name).join(' ');
  const fields = [
    { value: product.name, weight: 10 },
    { value: product.subcategory, weight: 7 },
    { value: product.category, weight: 6 },
    { value: colors, weight: 3 },
    { value: product.description, weight: 2 }
  ];

  let score = 0;

  fields.forEach(field => {
    score += scoreAgainstField(phrase, field.value, field.weight);
  });

  let coveredTerms = 0;

  terms.forEach(term => {
    let bestTermScore = 0;
    fields.forEach(field => {
      const nextScore = scoreAgainstField(term, field.value, field.weight);
      if (nextScore > bestTermScore) {
        bestTermScore = nextScore;
      }
    });

    if (bestTermScore > 0) {
      coveredTerms += 1;
    }

    score += bestTermScore;
  });

  const coverageRatio = coveredTerms / terms.length;
  score += Math.round(coverageRatio * 40);
  if (coveredTerms === terms.length) {
    score += 20;
  }

  return score;
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

  const fetchResults = async (query) => {
    const term = String(query || '').trim();
    resultCount.textContent = term ? `Searching for “${term}”...` : 'Start typing to search products.';

    if (!term || term.length < 2) {
      grid.innerHTML = '<div class="profile-empty-state" style="grid-column: 1 / -1;"><h3>Search your catalog</h3><p>Type at least 2 characters to find products from the live products table.</p></div>';
      resultCount.textContent = 'Type at least 2 characters to search.';
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

    const ranked = result.data
      .map(normalizeProduct)
      .map(product => ({ product, score: scoreProduct(product, term) }))
      .sort((left, right) => right.score - left.score || String(left.product.name || '').localeCompare(String(right.product.name || '')));

    const minimumScore = 14;
    const filtered = ranked.filter(entry => entry.score >= minimumScore);
    const products = (filtered.length ? filtered : ranked).map(entry => entry.product);

    if (products.length === 0) {
      grid.innerHTML = '<div class="profile-empty-state" style="grid-column: 1 / -1;"><h3>No products found</h3><p>Try a different keyword, category, or subcategory.</p></div>';
      resultCount.textContent = `0 results for “${term}”`;
      return;
    }

    grid.innerHTML = products.map(product => renderSearchCard(product, wishlistIds.has(product.id))).join('');
    resultCount.textContent = `${products.length} ranked result${products.length === 1 ? '' : 's'} for “${term}”`;

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
