import { cart } from '../utils/cart.js';
import {
  getProduct,
  getUserWishlist,
  getUserCompare,
  toggleWishlistProductSync,
  toggleCompareProductSync
} from '../utils/cloudflare.js';
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

function parseColors(product) {
  const source = product?.colors;
  if (!source) {
    return [];
  }

  const list = Array.isArray(source) ? source : (typeof source === 'string' ? JSON.parse(source) : []);
  return (Array.isArray(list) ? list : [])
    .slice(0, 4)
    .map(item => ({
      name: typeof item === 'string' ? item : item?.name || item?.hex || 'Color',
      hex: typeof item === 'string' ? item : item?.hex || '#d9c7d2'
    }));
}

function parseDetails(product) {
  const source = product?.details;
  if (!source) {
    return {};
  }

  if (typeof source === 'object') {
    return source;
  }

  try {
    const parsed = JSON.parse(source);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function renderProductNotFound() {
  return `
    <section class="section">
      <div class="container" style="text-align: center;">
        <h1>Product Not Found</h1>
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">This product may be inactive or not added yet.</p>
        <a href="#/shop" class="btn">Back to Shop</a>
      </div>
    </section>
  `;
}

function renderProductTemplate(product, wished, compared) {
  const details = parseDetails(product);
  const detailRows = Object.entries(details)
    .map(([key, value]) => `
      <div style="border-bottom: 1px solid var(--border-color); padding: 10px 0; display: flex; justify-content: space-between; gap: 1rem;">
        <span style="font-weight: 600; text-transform: uppercase; font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(key)}</span>
        <span style="font-size: 0.9rem; text-align: right;">${escapeHtml(value)}</span>
      </div>
    `)
    .join('');

  const colors = parseColors(product)
    .map(color => `<span style="width:16px;height:16px;border-radius:999px;border:1px solid rgba(20,20,20,0.25);background:${escapeHtml(color.hex)};display:inline-block;" title="${escapeHtml(color.name)}"></span>`)
    .join('');

  const image = getProductImageAttrs(product.image_url || product.image, {
    desktopWidth: 1200,
    sizes: '(max-width: 768px) 95vw, (max-width: 1200px) 50vw, 46vw',
    aspectRatio: '4:5'
  });

  return `
    <div class="container section">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <a href="#/shop">Shop</a> / <span>${escapeHtml(product.name || 'Product')}</span>
      </div>

      <div class="product-page-layout">
        <div class="product-gallery" id="product-gallery">
          <div class="product-image-stage">
            <img
              class="product-hero-image lazy-image"
              id="product-hero-image"
              src="${image.placeholder}"
              data-src="${image.src}"
              data-srcset="${image.srcset}"
              sizes="${image.sizes}"
              width="1200"
              height="1500"
              alt="${escapeHtml(product.name)}"
              decoding="async"
              loading="lazy"
            >
          </div>
          <div class="product-zoom-view" id="product-zoom-view" aria-hidden="true"></div>
        </div>

        <div class="product-info product-info-card" >
          <p style="color: var(--accent-pink); font-weight: 600; text-transform: uppercase; letter-spacing: 2px; font-size: 0.8rem; margin-bottom: 0.5rem;">${escapeHtml(product.category || 'General')}</p>
          <h1 style="margin-bottom: 1rem;">${escapeHtml(product.name || 'Product')}</h1>
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
            <h2 style="margin-bottom: 0; color: var(--text-primary);">${formatINR(product.price)}</h2>
            <span id="product-stock-status" class="stock-indicator" data-stock-label data-product-id="${product.id}" style="color: var(--accent-pink); font-size: 0.9rem; font-weight: 600;">Checking stock...</span>
          </div>

          <p style="margin-bottom: 2rem; color: var(--text-secondary); line-height: 1.8;">${escapeHtml(product.description || 'Description will be updated soon.')}</p>

          <div style="display:flex;align-items:center;gap:0.45rem; margin-bottom:1.4rem;">
            ${colors}
          </div>

          <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 1px; font-size: 0.9rem; border-bottom: 2px solid var(--accent-pink); display: inline-block;">Product Details</h4>
            <div style="margin-top: 0.5rem;">
              ${detailRows || '<p style="font-size:0.9rem;color:var(--text-secondary);">Detailed specs will be updated shortly.</p>'}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1rem; margin-bottom: 2rem;">
            <input type="number" id="product-qty" value="1" min="1" style="padding: 12px; border: 1px solid var(--border-color); text-align: center; font-family: inherit;">
            <button id="add-to-cart-btn" class="btn" data-product-id="${product.id}" data-default-label="Add to Cart" style="width: 100%;">Add to Cart</button>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr; gap:0.8rem; margin-bottom:1.3rem;">
            <button id="product-wishlist-btn" class="btn btn-outline wishlist-toggle${wished ? ' is-active' : ''}" data-product-id="${product.id}">${wished ? 'In Wishlist' : 'Add to Wishlist'}</button>
            <button id="product-compare-btn" class="btn btn-outline compare-toggle${compared ? ' is-active' : ''}" data-product-id="${product.id}">${compared ? 'In Compare' : 'Add to Compare'}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initProductImageZoom() {
  const gallery = document.getElementById('product-gallery');
  const image = document.getElementById('product-hero-image');
  const zoom = document.getElementById('product-zoom-view');

  if (!gallery || !image || !zoom) {
    return;
  }

  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!supportsHover) {
    return;
  }

  const syncZoomImage = () => {
    const source = image.currentSrc || image.getAttribute('src') || '';
    if (source) {
      zoom.style.backgroundImage = `url("${source}")`;
    }
  };

  const handleMove = event => {
    const bounds = image.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    const xClamped = Math.max(0, Math.min(100, x));
    const yClamped = Math.max(0, Math.min(100, y));
    zoom.style.backgroundPosition = `${xClamped}% ${yClamped}%`;
  };

  image.addEventListener('mouseenter', () => {
    syncZoomImage();
    gallery.classList.add('zoom-active');
  });

  image.addEventListener('mousemove', handleMove);

  image.addEventListener('mouseleave', () => {
    gallery.classList.remove('zoom-active');
  });

  image.addEventListener('load', syncZoomImage, { once: true });
  syncZoomImage();
}

export function ProductPage(id) {
  return `
    <section class="section">
      <div class="container" id="product-page-root" data-product-id="${String(id || '').trim()}">
        <div class="profile-loading">Loading product...</div>
      </div>
    </section>
  `;
}

export async function initProductPage(productId) {
  const root = document.getElementById('product-page-root');
  if (!root) {
    return;
  }

  const id = String(productId || '').trim();
  if (!id) {
    root.innerHTML = renderProductNotFound();
    return;
  }

  const [productResult, wishlistResult, compareResult] = await Promise.all([
    getProduct(id),
    getUserWishlist(),
    getUserCompare()
  ]);

  if (!productResult.success || !productResult.data) {
    root.innerHTML = renderProductNotFound();
    return;
  }

  const product = productResult.data;
  const wishlistIds = new Set((wishlistResult.success ? wishlistResult.data : []).map(item => String(item).trim()).filter(Boolean));
  const compareIds = new Set((compareResult.success ? compareResult.data : []).map(item => String(item).trim()).filter(Boolean));

  root.outerHTML = renderProductTemplate(product, wishlistIds.has(id), compareIds.has(id));
  initLazyLoading();
  initProductImageZoom();

  window.dispatchEvent(new CustomEvent('catalogHydrated', {
    detail: {
      products: [{
        id: product.id,
        name: product.name || 'Product',
        category: product.category || 'General',
        price: Number(product.price || 0),
        image: product.image || product.image_url || 'https://via.placeholder.com/600x600?text=Images+Coming+Soon',
        description: product.description || ''
      }]
    }
  }));

  const qtyInput = document.getElementById('product-qty');
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const wishlistBtn = document.getElementById('product-wishlist-btn');
  const compareBtn = document.getElementById('product-compare-btn');

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const parsedQuantity = Number(qtyInput?.value);
      const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.floor(parsedQuantity) : 1;
      cart.addItem({
        id: String(product.id || '').trim(),
        name: product.name || 'Product',
        category: product.category || 'General',
        price: Number(product.price || 0),
        image: product.image || product.image_url || 'https://via.placeholder.com/600x600?text=Images+Coming+Soon',
        description: product.description || ''
      }, quantity);
      addToCartBtn.textContent = 'Added';
      setTimeout(() => {
        addToCartBtn.textContent = addToCartBtn.dataset.defaultLabel || 'Add to Cart';
      }, 900);
    });
  }

  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', async () => {
      const result = await toggleWishlistProductSync(id);
      if (!result.success) {
        alert(result.error === 'Please login first' ? 'Please login to add items to your wishlist' : 'Unable to update wishlist');
        return;
      }
      wishlistBtn.classList.toggle('is-active', result.active);
      wishlistBtn.textContent = result.active ? 'In Wishlist' : 'Add to Wishlist';
    });
  }

  if (compareBtn) {
    compareBtn.addEventListener('click', async () => {
      const result = await toggleCompareProductSync(id);
      if (!result.success) {
        if (result.error === 'Please login first') {
          alert('Please login to compare products');
        } else if (result.error && result.error.toLowerCase().includes('limit')) {
          alert('You can compare up to 4 products at once.');
        } else {
          alert('Unable to update compare list');
        }
        return;
      }
      compareBtn.classList.toggle('is-active', result.active);
      compareBtn.textContent = result.active ? 'In Compare' : 'Add to Compare';
    });
  }
}
