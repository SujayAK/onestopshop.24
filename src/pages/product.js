import { cart } from '../utils/cart.js';
import {
  getProduct,
  getUserWishlist,
  getUserCompare,
  toggleWishlistProductSync,
  toggleCompareProductSync
} from '../utils/cloudflare.js';
import { getProductImageAttrs, initLazyLoading, toThumbnailUrl, toFullImageUrl } from '../utils/image-optimization.js';
import { showAuthRequiredPopup, showInfoPopup } from '../utils/ui-popup.js';

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

function parseJsonValue(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function parseColors(product) {
  const list = parseJsonValue(product?.colors, []);
  return (Array.isArray(list) ? list : [])
    .map(item => ({
      name: typeof item === 'string' ? item : item?.name || item?.hex || 'Color',
      hex: typeof item === 'string' ? item : item?.hex || '#d9c7d2'
    }));
}

function parseDetails(product) {
  const parsed = parseJsonValue(product?.details || product?.details_json, {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function buildMissingImageUrl(colorName, viewName) {
  const label = `Add ${colorName} ${viewName} image.webp`;
  return `https://placehold.co/920x1150/f7edf3/7b5a6f?text=${encodeURIComponent(label)}`;
}

function normalizeViewLabel(value, fallback) {
  const text = String(value || '').trim();
  if (!text) {
    return fallback;
  }

  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function normalizeViews(rawViews, colorName) {
  let source = rawViews;
  if (typeof source === 'string') {
    source = parseJsonValue(source, []);
  }

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    source = Object.entries(source).map(([label, value]) => {
      if (typeof value === 'string') {
        return { label, url: value };
      }
      return { label, ...(value || {}) };
    });
  }

  const list = Array.isArray(source) ? source : [];
  if (list.length === 0) {
    return [{
      label: 'Primary',
      url: buildMissingImageUrl(colorName, 'primary')
    }];
  }

  return list.map((view, index) => {
    const objectView = typeof view === 'string' ? { url: view } : (view || {});
    const label = normalizeViewLabel(objectView.label || objectView.name || objectView.view || objectView.angle, `View ${index + 1}`);
    const url = String(objectView.url || objectView.image_url || objectView.image || objectView.src || '').trim();
    return {
      label,
      url: url || buildMissingImageUrl(colorName, label.toLowerCase())
    };
  });
}

function normalizeProductMedia(product) {
  const productColors = parseColors(product);
  const details = parseDetails(product);

  const variantsRaw = parseJsonValue(
    product?.variants || product?.variant_images || product?.color_variants || product?.media_variants,
    []
  );

  const galleryRaw = parseJsonValue(
    product?.media_gallery || product?.media_json || product?.images || product?.gallery || details.images || details.gallery,
    []
  );

  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];
  const colors = [];

  if (variants.length > 0) {
    variants.forEach((variant, index) => {
      const baseColor = productColors[index] || {};
      const colorName = String(variant?.color || variant?.name || baseColor.name || `Color ${index + 1}`);
      const colorHex = String(variant?.hex || baseColor.hex || '#d9c7d2');
      colors.push({
        id: `color-${index}`,
        name: colorName,
        hex: colorHex,
        views: normalizeViews(variant?.views || variant?.images || variant?.gallery, colorName)
      });
    });
  }

  if (colors.length === 0) {
    const fallbackColorName = productColors[0]?.name || 'Default';
    const fallbackColorHex = productColors[0]?.hex || '#d9c7d2';
    const galleryViews = normalizeViews(galleryRaw, fallbackColorName);
    colors.push({
      id: 'color-0',
      name: fallbackColorName,
      hex: fallbackColorHex,
      views: galleryViews
    });
  }

  if (colors[0].views.length === 0) {
    colors[0].views = [{
      label: 'Primary',
      url: String(product.image_url || product.image || '').trim() || buildMissingImageUrl(colors[0].name, 'primary')
    }];
  }

  return colors;
}

function getCurrentPriceAndDiscount(product) {
  const currentPrice = Number(product?.price || 0);
  const discountPercentRaw = Number(product?.discount || 0);
  const discountPercent = discountPercentRaw > 0 ? Math.min(95, discountPercentRaw) : 40;
  const originalPrice = currentPrice > 0 ? (currentPrice / (1 - discountPercent / 100)) : 0;
  return { currentPrice, discountPercent, originalPrice };
}

function buildMaterialContent(product) {
  const details = parseDetails(product);
  const entries = Object.entries(details);
  if (entries.length === 0) {
    return '<p>Material details pending. Add fields like Material, Lining, Hardware, and Care in product details.</p>';
  }

  return `
    <ul class="product-meta-list">
      ${entries.map(([key, value]) => `<li><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></li>`).join('')}
    </ul>
  `;
}

function buildShippingContent(product) {
  const timeline = String(product?.delivery_timeline || '6-8 days').trim();
  return `
    <div class="product-shipping-copy">
      <p>Delivery Timeline: ${escapeHtml(timeline)}</p>
      <p>Orders are processed in 24-48 hours. Tracking details are shared once dispatched.</p>
      <p>Shipping charges are calculated at checkout based on destination and weight.</p>
    </div>
  `;
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

function renderColorRail(colors, activeColorIndex) {
  return colors.map((color, index) => {
    const primaryView = color.views[0] || { label: 'Primary', url: buildMissingImageUrl(color.name, 'primary') };
    const thumb = getProductImageAttrs(toThumbnailUrl(primaryView.url), {
      desktopWidth: 180,
      sizes: '72px',
      aspectRatio: '1:1'
    });

    return `
      <button type="button" class="product-color-rail-item${index === activeColorIndex ? ' is-active' : ''}" data-color-index="${index}" aria-label="Switch to ${escapeHtml(color.name)}" title="${escapeHtml(color.name)}">
        <img src="${thumb.src}" alt="${escapeHtml(color.name)} color">
        <span>${escapeHtml(color.name)}</span>
      </button>
    `;
  }).join('');
}

function renderAngles(views, activeViewIndex) {
  return views.map((view, index) => {
    const thumb = getProductImageAttrs(toThumbnailUrl(view.url), {
      desktopWidth: 260,
      sizes: '110px',
      aspectRatio: '1:1'
    });
    return `
      <button type="button" class="product-angle-thumb${index === activeViewIndex ? ' is-active' : ''}" data-view-index="${index}" aria-label="${escapeHtml(view.label)}">
        <img src="${thumb.src}" alt="${escapeHtml(view.label)}">
        <span>${escapeHtml(view.label)}</span>
      </button>
    `;
  }).join('');
}

function renderColorSwatches(colors, activeColorIndex) {
  return colors.map((color, index) => `
    <button
      type="button"
      class="product-color-swatch${index === activeColorIndex ? ' is-active' : ''}"
      data-color-index="${index}"
      title="${escapeHtml(color.name)}"
      aria-label="Choose ${escapeHtml(color.name)}"
      style="--swatch:${escapeHtml(color.hex)};"
    ></button>
  `).join('');
}

function renderAccordion(id, title, content) {
  return `
    <div class="product-accordion-item" data-accordion-item>
      <button type="button" class="product-accordion-trigger" data-accordion-toggle="${id}" aria-expanded="false">
        <span>${escapeHtml(title)}</span>
        <i class="fas fa-plus" aria-hidden="true"></i>
      </button>
      <div id="${id}" class="product-accordion-panel" hidden>
        ${content}
      </div>
    </div>
  `;
}

function renderProductTemplate(product, wished, compared) {
  const media = normalizeProductMedia(product);
  const activeColor = media[0];
  const activeView = activeColor.views[0];
  const mainImage = getProductImageAttrs(toFullImageUrl(activeView.url), {
    desktopWidth: 1300,
    sizes: '(max-width: 980px) 100vw, 46vw',
    aspectRatio: '4:5'
  });
  const { currentPrice, originalPrice, discountPercent } = getCurrentPriceAndDiscount(product);

  return `
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <a href="#/shop">Shop</a> / <span>${escapeHtml(product.name || 'Product')}</span>
      </div>

      <div class="product-page-layout">
        <div class="product-gallery" id="product-gallery">
          <aside class="product-color-rail" id="product-color-rail">
            ${renderColorRail(media, 0)}
          </aside>

          <div class="product-media-main">
            <div class="product-image-stage">
              <img
                class="product-hero-image lazy-image"
                id="product-hero-image"
                src="${mainImage.src}"
                data-src="${mainImage.src}"
                data-srcset="${mainImage.srcset}"
                sizes="${mainImage.sizes}"
                width="1200"
                height="1500"
                alt="${escapeHtml(product.name)} - ${escapeHtml(activeColor.name)} - ${escapeHtml(activeView.label)}"
                decoding="async"
                loading="eager"
              >
              <div class="product-zoom-view" id="product-zoom-view" aria-hidden="true"></div>
            </div>

            <div class="product-angle-strip" id="product-angle-strip">
              ${renderAngles(activeColor.views, 0)}
            </div>
          </div>

          <div class="product-mobile-swatch-row" id="product-mobile-swatch-row">
            ${renderColorSwatches(media, 0)}
          </div>
        </div>

        <div class="product-info product-info-card">
          <p class="product-category-kicker">${escapeHtml(product.category || 'General')}</p>
          <h1 class="product-title">${escapeHtml(product.name || 'Product')}</h1>

          <div class="product-price-stack">
            <div class="product-price-row">
              <strong class="product-price-current">${formatINR(currentPrice)}</strong>
              <span class="product-price-original">${formatINR(originalPrice)}</span>
              <span class="product-discount-badge">${Math.round(discountPercent)}% OFF</span>
            </div>
            <p class="product-tax-note">Taxes included. Shipping calculated at checkout.</p>
          </div>

          <div class="product-review-row" aria-label="1 review">
            <div class="product-stars" aria-hidden="true">★★★★★</div>
            <span>1 review</span>
          </div>

          <div class="product-color-block">
            <p class="product-color-label">Color: <strong id="product-active-color">${escapeHtml(activeColor.name)}</strong></p>
            <div class="product-color-swatches" id="product-color-swatches">
              ${renderColorSwatches(media, 0)}
            </div>
          </div>

          <p class="product-delivery-line">Delivery Timeline: ${escapeHtml(String(product.delivery_timeline || '6-8 days'))}</p>

          <div class="product-stock-row">
            <span id="product-stock-status" class="stock-indicator" data-stock-label data-product-id="${product.id}">Checking stock...</span>
          </div>

          <p class="product-description">${escapeHtml(product.description || 'Description will be updated soon.')}</p>

          <div class="product-cart-row">
            <div class="product-qty-control" role="group" aria-label="Quantity selector">
              <button type="button" data-qty-action="decrease" data-qty-target="product-qty">-</button>
              <input type="number" id="product-qty" min="1" value="1" inputmode="numeric" aria-label="Quantity">
              <button type="button" data-qty-action="increase" data-qty-target="product-qty">+</button>
            </div>
            <button id="add-to-cart-btn" class="btn add-to-cart-btn" data-product-id="${product.id}" data-default-label="Add to Cart">Add to Cart</button>
            <button id="buy-now-btn" class="btn btn-outline" data-product-id="${product.id}">Buy Now</button>
          </div>

          <div class="product-quick-actions">
            <button id="product-wishlist-btn" class="btn btn-outline wishlist-toggle${wished ? ' is-active' : ''}" data-product-id="${product.id}">${wished ? 'In Wishlist' : 'Add to Wishlist'}</button>
            <button id="product-compare-btn" class="btn btn-outline compare-toggle${compared ? ' is-active' : ''}" data-product-id="${product.id}">${compared ? 'In Compare' : 'Add to Compare'}</button>
          </div>

          <div class="product-accordion">
            ${renderAccordion('product-material-panel', 'Material & Make', buildMaterialContent(product))}
            ${renderAccordion('product-shipping-panel', 'Shipping Policy', buildShippingContent(product))}
          </div>
        </div>
      </div>

      <div class="product-sticky-bar" id="product-sticky-bar" data-product-id="${product.id}">
        <div class="product-sticky-media">
            <img
            id="product-sticky-thumb"
            src="${mainImage.src}"
            alt="${escapeHtml(product.name)}"
            width="56"
            height="56"
          >
          <div>
            <p class="product-sticky-title">${escapeHtml(product.name || 'Product')}</p>
            <p class="product-sticky-price">${formatINR(currentPrice)}</p>
          </div>
        </div>

        <div class="product-sticky-actions">
          <div class="product-qty-control product-qty-control-compact" role="group" aria-label="Sticky quantity selector">
            <button type="button" data-qty-action="decrease" data-qty-target="sticky-product-qty">-</button>
            <input type="number" id="sticky-product-qty" min="1" value="1" inputmode="numeric" aria-label="Sticky quantity">
            <button type="button" data-qty-action="increase" data-qty-target="sticky-product-qty">+</button>
          </div>
          <button id="sticky-add-to-cart-btn" class="btn add-to-cart-btn" data-product-id="${product.id}" data-default-label="Add to Cart">Add to Cart</button>
          <button id="sticky-buy-now-btn" class="btn btn-outline" data-product-id="${product.id}">Buy Now</button>
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
    <section class="section section-compact product-page-section">
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
  const wishlistSource = wishlistResult.success && Array.isArray(wishlistResult.data) ? wishlistResult.data : [];
  const compareSource = compareResult.success && Array.isArray(compareResult.data) ? compareResult.data : [];
  const wishlistIds = new Set(wishlistSource.map(item => String(item).trim()).filter(Boolean));
  const compareIds = new Set(compareSource.map(item => String(item).trim()).filter(Boolean));

  const media = normalizeProductMedia(product);
  const state = {
    colorIndex: 0,
    viewIndex: 0,
    quantity: 1
  };

  root.innerHTML = renderProductTemplate(product, wishlistIds.has(id), compareIds.has(id));
  
  initLazyLoading();
  initProductImageZoom();

  window.dispatchEvent(new CustomEvent('catalogHydrated', {
    detail: {
      products: [{
        id: product.id,
        name: product.name || 'Product',
        category: product.category || 'General',
        price: Number(product.price || 0),
        image: media[0]?.views?.[0]?.url || product.image || product.image_url || 'https://placehold.co/900x1125?text=Add+product+image.webp',
        description: product.description || ''
      }]
    }
  }));

  const qtyInput = document.getElementById('product-qty');
  const stickyQtyInput = document.getElementById('sticky-product-qty');
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const buyNowBtn = document.getElementById('buy-now-btn');
  const stickyAddToCartBtn = document.getElementById('sticky-add-to-cart-btn');
  const stickyBuyNowBtn = document.getElementById('sticky-buy-now-btn');
  const wishlistBtn = document.getElementById('product-wishlist-btn');
  const compareBtn = document.getElementById('product-compare-btn');
  const colorRail = document.getElementById('product-color-rail');
  const colorSwatches = document.getElementById('product-color-swatches');
  const mobileSwatches = document.getElementById('product-mobile-swatch-row');
  const angleStrip = document.getElementById('product-angle-strip');
  const heroImage = document.getElementById('product-hero-image');
  const stickyThumb = document.getElementById('product-sticky-thumb');
  const activeColorLabel = document.getElementById('product-active-color');
  const gallery = document.getElementById('product-gallery');
  const zoom = document.getElementById('product-zoom-view');

  const getActiveColor = () => media[state.colorIndex] || media[0];
  const getActiveView = () => {
    const color = getActiveColor();
    return color.views[state.viewIndex] || color.views[0];
  };

  const syncQuantityInputs = () => {
    if (qtyInput) {
      qtyInput.value = String(state.quantity);
    }
    if (stickyQtyInput) {
      stickyQtyInput.value = String(state.quantity);
    }
  };

  const setQuantity = value => {
    const parsed = Number(value);
    const next = Number.isFinite(parsed) ? Math.max(1, Math.min(99, Math.floor(parsed))) : 1;
    state.quantity = next;
    syncQuantityInputs();
  };

  const updateHeroFromState = () => {
    if (!heroImage) {
      return;
    }

    const color = getActiveColor();
    const view = getActiveView();
    const hero = getProductImageAttrs(toFullImageUrl(view.url), {
      desktopWidth: 1300,
      sizes: '(max-width: 980px) 100vw, 46vw',
      aspectRatio: '4:5'
    });

    heroImage.src = hero.src;
    heroImage.srcset = hero.srcset;
    heroImage.setAttribute('data-src', hero.src);
    heroImage.setAttribute('data-srcset', hero.srcset);
    heroImage.alt = `${product.name || 'Product'} - ${color.name} - ${view.label}`;

    if (stickyThumb) {
      const compact = getProductImageAttrs(toThumbnailUrl(view.url), {
        desktopWidth: 120,
        sizes: '56px',
        aspectRatio: '1:1'
      });
      stickyThumb.src = compact.src;
    }

    if (zoom) {
      zoom.style.backgroundImage = `url("${hero.src}")`;
      if (gallery) {
        gallery.classList.remove('zoom-active');
      }
    }

    if (activeColorLabel) {
      activeColorLabel.textContent = color.name;
    }

    if (angleStrip) {
      angleStrip.innerHTML = renderAngles(color.views, state.viewIndex);
      angleStrip.querySelectorAll('[data-view-index]').forEach(button => {
        button.addEventListener('click', () => {
          const index = Number(button.getAttribute('data-view-index'));
          if (!Number.isFinite(index)) {
            return;
          }
          state.viewIndex = index;
          updateHeroFromState();
        });
      });
    }

    const markColorSelection = container => {
      if (!container) {
        return;
      }
      container.querySelectorAll('[data-color-index]').forEach(element => {
        const index = Number(element.getAttribute('data-color-index'));
        element.classList.toggle('is-active', index === state.colorIndex);
      });
    };

    markColorSelection(colorRail);
    markColorSelection(colorSwatches);
    markColorSelection(mobileSwatches);
  };

  const bindColorSelector = container => {
    if (!container) {
      return;
    }

    container.querySelectorAll('[data-color-index]').forEach(button => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-color-index'));
        if (!Number.isFinite(index)) {
          return;
        }

        state.colorIndex = Math.max(0, Math.min(media.length - 1, index));
        state.viewIndex = 0;
        updateHeroFromState();
      });
    });
  };

  bindColorSelector(colorRail);
  bindColorSelector(colorSwatches);
  bindColorSelector(mobileSwatches);

  document.querySelectorAll('[data-accordion-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const panelId = button.getAttribute('data-accordion-toggle');
      const panel = panelId ? document.getElementById(panelId) : null;
      if (!panel) {
        return;
      }

      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
      button.closest('[data-accordion-item]')?.classList.toggle('is-open', !expanded);
    });
  });

  document.querySelectorAll('[data-qty-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-qty-action');
      if (action === 'increase') {
        setQuantity(state.quantity + 1);
      } else {
        setQuantity(state.quantity - 1);
      }
    });
  });

  [qtyInput, stickyQtyInput].forEach(input => {
    if (!input) {
      return;
    }
    input.addEventListener('change', () => setQuantity(input.value));
    input.addEventListener('input', () => setQuantity(input.value));
  });

  const addSelectedVariantToCart = (button, options = {}) => {
    if (!button || button.disabled || button.dataset.stockBlocked === 'true') {
      return false;
    }

    const color = getActiveColor();
    const view = getActiveView();
    cart.addItem({
      id: String(product.id || '').trim(),
      name: product.name || 'Product',
      category: product.category || 'General',
      price: Number(product.price || 0),
      image: view.url,
      image_url: view.url,
      description: product.description || '',
      selected_color: color.name,
      selected_view: view.label
    }, state.quantity);

    if (!options.silent) {
      button.textContent = 'Added';
      setTimeout(() => {
        button.textContent = button.dataset.defaultLabel || 'Add to Cart';
      }, 900);
    }

    return true;
  };

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => addSelectedVariantToCart(addToCartBtn));
  }

  if (stickyAddToCartBtn) {
    stickyAddToCartBtn.addEventListener('click', () => addSelectedVariantToCart(stickyAddToCartBtn));
  }

  const handleBuyNow = button => {
    if (!button || button.disabled || button.dataset.stockBlocked === 'true') {
      return;
    }

    const added = addSelectedVariantToCart(button, { silent: true });
    if (!added) {
      return;
    }

    window.location.hash = '#/checkout';
  };

  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => handleBuyNow(buyNowBtn));
  }

  if (stickyBuyNowBtn) {
    stickyBuyNowBtn.addEventListener('click', () => handleBuyNow(stickyBuyNowBtn));
  }

  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', async () => {
      const result = await toggleWishlistProductSync(id);
      if (!result.success) {
        if (result.error === 'Please login first') {
          showAuthRequiredPopup('Sign in to add items to your wishlist and keep them saved.');
        } else {
          showInfoPopup('Unable to update wishlist right now. Please try again.');
        }
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
          showAuthRequiredPopup('Sign in to compare products across sessions.');
        } else if (result.error && result.error.toLowerCase().includes('limit')) {
          showInfoPopup('You can compare up to 4 products at once.');
        } else {
          showInfoPopup('Unable to update compare list right now.');
        }
        return;
      }
      compareBtn.classList.toggle('is-active', result.active);
      compareBtn.textContent = result.active ? 'In Compare' : 'Add to Compare';
    });
  }

  syncQuantityInputs();
  updateHeroFromState();
}
