/**
 * Image Optimization Utility
 * Cost-Efficient Solutions for E-Commerce Images
 * 
 * STRATEGY:
 * 1. Use FREE stock image sources (Unsplash, Pexels, Pixabay)
 * 2. Implement lazy loading to reduce bandwidth
 * 3. Use responsive images with srcset
 * 4. Compress with WebP format fallback
 * 5. CDN optimization (Cloudflare Images - cheap/free tier available)
 */

/**
 * FREE IMAGE SOURCES (Zero Cost)
 * - Unsplash: https://unsplash.com/api/
 * - Pexels: https://www.pexels.com/api/
 * - Pixabay: https://pixabay.com/api/
 */

/**
 * Generate optimized image URL with size variant
 * Use this to serve different sizes to different screens
 * 
 * @param {string} imageUrl - Original image URL
 * @param {number} width - Desired width in pixels
 * @param {string} service - Service to use (cloudflare, imgix, or none)
 * @returns {string} Optimized URL
 */
export function getOptimizedImageUrl(imageUrl, width = 400, service = 'none') {
  if (!imageUrl) return 'https://via.placeholder.com/400x400?text=No+Image';

  // If already a placeholder or data URL, return as-is
  if (imageUrl.includes('placeholder') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  const trimmed = String(imageUrl).trim();
  const cloudflareImageService = String(import.meta.env.VITE_IMAGE_SERVICE || '').trim().toLowerCase();
  const cloudflareDeliveryDomain = String(import.meta.env.VITE_CLOUDFLARE_DELIVERY_DOMAIN || '').trim();
  const r2PublicBaseUrl = String(import.meta.env.VITE_R2_PUBLIC_BASE_URL || '').trim();

  const normalizedDeliveryDomain = cloudflareDeliveryDomain
    ? cloudflareDeliveryDomain.replace(/\/$/, '')
    : '';

  const normalizedR2Base = r2PublicBaseUrl
    ? r2PublicBaseUrl.replace(/\/$/, '')
    : '';

  const usingCloudflareService = service === 'cloudflare' || cloudflareImageService === 'cloudflare';

  const buildCloudflareCdnImageUrl = sourceUrl => {
    if (!normalizedDeliveryDomain) {
      return sourceUrl;
    }

    const safeWidth = Number.isFinite(Number(width)) ? Math.max(160, Math.floor(Number(width))) : 400;
    const quality = Math.max(60, Math.min(85, Number(import.meta.env.VITE_IMAGE_QUALITY || 78)));
    return `${normalizedDeliveryDomain}/cdn-cgi/image/format=auto,quality=${quality},fit=cover,width=${safeWidth}/${sourceUrl}`;
  };

  if (normalizedR2Base && trimmed.startsWith(normalizedR2Base)) {
    return usingCloudflareService ? buildCloudflareCdnImageUrl(trimmed) : trimmed;
  }

  if (trimmed.includes('googleusercontent.com') || trimmed.includes('ggpht.com')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('w', String(Math.max(180, Math.floor(Number(width) || 400))));
      return parsed.toString();
    } catch (_error) {
      return trimmed;
    }
  }

  // Option 1: Using Imgix (free tier available)
  if (service === 'imgix' && !imageUrl.includes('imgix')) {
    return `https://demo.imgix.net/${imageUrl}?w=${width}&auto=format&fit=crop&q=80`;
  }

  // Option 2: Using Cloudflare Image Optimization (requires setup)
  if (usingCloudflareService) {
    if (normalizedDeliveryDomain) {
      return buildCloudflareCdnImageUrl(trimmed);
    }

    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}format=webp&w=${width}`;
  }

  // Unsplash supports URL parameters natively and is quality-safe for ecommerce.
  if (imageUrl.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(imageUrl);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'max');
      parsed.searchParams.set('q', '85');
      parsed.searchParams.set('w', String(width));
      return parsed.toString();
    } catch (_error) {
      return imageUrl;
    }
  }

  // Option 3: Native approach - add width parameter for lazy loading
  return imageUrl;
}

function swapVariantSuffix(imageUrl, targetVariant) {
  const raw = String(imageUrl || '').trim();
  if (!raw) {
    return raw;
  }

  // Keep query/hash suffixes intact when swapping between -full and -thumb.
  const match = raw.match(/^(.*?)(-full|-thumb)(\.[a-z0-9]+)((?:\?.*)?(?:#.*)?)$/i);
  if (!match) {
    return raw;
  }

  const [, base, , extension, suffix] = match;
  return `${base}-${targetVariant}${extension}${suffix || ''}`;
}

export function toThumbnailUrl(imageUrl) {
  return swapVariantSuffix(imageUrl, 'thumb');
}

export function toFullImageUrl(imageUrl) {
  return swapVariantSuffix(imageUrl, 'full');
}

/**
 * Generate responsive image srcset for different screen sizes
 * Reduces bandwidth by serving right-sized images
 * 
 * @param {string} imageUrl - Base image URL
 * @returns {string} srcset attribute value
 * 
 * EXAMPLE USAGE:
 * <img src="${imageUrl}" srcset="${getResponsiveImageSrcset(imageUrl)}" alt="Product">
 */
export function getResponsiveImageSrcset(imageUrl) {
  if (!imageUrl) return '';

  // Standard breakpoints for e-commerce
  const widths = [320, 480, 720, 960, 1280];
  
  return widths
    .map(w => `${getOptimizedImageUrl(imageUrl, w)} ${w}w`)
    .join(', ');
}

/**
 * Create consistent image attributes for product cards/detail pages.
 * This keeps quality high while shipping smaller files to smaller screens.
 *
 * @param {string} imageUrl - Original image URL from DB
 * @param {object} options - Rendering options
 * @returns {{src: string, srcset: string, sizes: string, placeholder: string}}
 */
export function getProductImageAttrs(imageUrl, options = {}) {
  const {
    desktopWidth = 900,
    sizes = '(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 23vw',
    aspectRatio = '4:5'
  } = options;

  const src = getOptimizedImageUrl(imageUrl, desktopWidth);
  const srcset = getResponsiveImageSrcset(imageUrl);

  const [ratioW, ratioH] = String(aspectRatio)
    .split(':')
    .map(value => Number(value));
  const safeRatioW = Number.isFinite(ratioW) && ratioW > 0 ? ratioW : 4;
  const safeRatioH = Number.isFinite(ratioH) && ratioH > 0 ? ratioH : 5;
  const placeholderWidth = 80 * safeRatioW;
  const placeholderHeight = 80 * safeRatioH;

  const placeholderSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='${placeholderWidth}' height='${placeholderHeight}' viewBox='0 0 ${placeholderWidth} ${placeholderHeight}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23f7ebf2' offset='0'/><stop stop-color='%23f1dae9' offset='1'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)'/></svg>`;

  return {
    src,
    srcset,
    sizes,
    placeholder: `data:image/svg+xml,${placeholderSvg}`
  };
}

/**
 * Create lazy-loadable image HTML with Intersection Observer
 * Reduces initial page load time significantly
 * 
 * @param {object} options - Configuration
 * @returns {string} HTML markup
 */
export function createLazyImage({
  src,
  alt,
  width = 300,
  height = 300,
  className = '',
  dataProductId = ''
}) {
  const placeholder = 'https://via.placeholder.com/300x300?text=Loading...';
  const srcset = getResponsiveImageSrcset(src);
  
  return `
    <img 
      class="lazy-image ${className}"
      src="${placeholder}"
      data-src="${src}"
      data-srcset="${srcset}"
      width="${width}"
      height="${height}"
      alt="${alt}"
      ${dataProductId ? `data-product-id="${dataProductId}"` : ''}
      loading="lazy"
      style="width: 100%; height: auto; object-fit: cover; background: #f0f0f0;"
    />
  `;
}

/**
 * Initialize Intersection Observer for lazy loading
 * Call this once on page load to enable lazy image loading
 * 
 * EXAMPLE:
 * document.addEventListener('DOMContentLoaded', initLazyLoading);
 */
export function initLazyLoading() {
  const lazyImages = document.querySelectorAll('.lazy-image');
  if (lazyImages.length === 0) {
    return;
  }

  const markLoaded = img => {
    if (img.complete) {
      img.classList.add('loaded');
      return;
    }

    img.addEventListener('load', () => {
      img.classList.add('loaded');
    }, { once: true });

    img.addEventListener('error', () => {
      img.classList.add('loaded');
    }, { once: true });
  };

  if (typeof IntersectionObserver === 'undefined') {
    lazyImages.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
      if (img.dataset.srcset) {
        img.srcset = img.dataset.srcset;
      }
      markLoaded(img);
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const img = entry.target;
      
      // Load the actual image
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
      
      if (img.dataset.srcset) {
        img.srcset = img.dataset.srcset;
      }

      markLoaded(img);
      observer.unobserve(img);
    });
  }, {
    rootMargin: '50px' // Start loading 50px before image enters viewport
  });

  // Observe all lazy images
  lazyImages.forEach(img => observer.observe(img));
}

/**
 * BEST FREE IMAGE SOURCES FOR E-COMMERCE
 * Use these APIs to dynamically fetch free product images
 */

// Unsplash - Best quality, unlimited free API requests
export const FREE_IMAGE_SOURCES = {
  unsplash: {
    name: 'Unsplash',
    api: 'https://api.unsplash.com/search/photos',
    key: 'YOUR_UNSPLASH_API_KEY', // Get free from https://unsplash.com/oauth/applications
    query: (category) => `${category} product fashion`,
    imageField: 'results[].urls.regular'
  },
  
  pexels: {
    name: 'Pexels',
    api: 'https://api.pexels.com/v1/search',
    key: 'YOUR_PEXELS_API_KEY', // Get free from https://www.pexels.com/api/
    query: (category) => `${category} product`,
    imageField: 'photos[].src.medium'
  },
  
  pixabay: {
    name: 'Pixabay',
    api: 'https://pixabay.com/api/',
    key: 'YOUR_PIXABAY_API_KEY', // Get free from https://pixabay.com/api/
    query: (category) => `${category} product`,
    imageField: 'hits[].webformatURL'
  }
};

/**
 * Fetch free stock image by category from Unsplash
 * 
 * @param {string} category - Product category (e.g., 'bags', 'shoes')
 * @returns {Promise<string>} Image URL or placeholder
 */
export async function fetchFreeStockImage(category = 'product') {
  try {
    // Using Unsplash API (no key needed for basic requests)
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${category}&per_page=1&client_id=YOUR_UNSPLASH_ACCESS_KEY`
    );
    
    if (!response.ok) return 'https://via.placeholder.com/400x400?text=Product+Image';
    
    const data = await response.json();
    return data.results?.[0]?.urls?.regular || 'https://via.placeholder.com/400x400?text=Product';
  } catch (error) {
    console.error('Failed to fetch stock image:', error);
    return 'https://via.placeholder.com/400x400?text=Product+Image';
  }
}

/**
 * IMAGE OPTIMIZATION TIPS FOR ECOMMERCE
 * 
 * 1. COMPRESSION:
 *    - Use TinyPNG, ImageOptim, or Squoosh for compression
 *    - Target: JPG ~80% quality = 70% file size reduction
 *    - WebP format = 25-35% smaller than JPG
 * 
 * 2. LAZY LOADING:
 *    - Load images only when user scrolls to them
 *    - Use loading="lazy" attribute (browser native)
 *    - Reduces bandwidth by ~40-60% on first load
 * 
 * 3. RESPONSIVE IMAGES:
 *    - Use srcset to serve different sizes
 *    - Mobile: 300-400px | Tablet: 600px | Desktop: 800-1000px
 *    - Reduces bandwidth on mobile by ~50%
 * 
 * 4. CDN STRATEGY (Free/Cheap):
 *    - Cloudflare: Free tier includes basic image optimization
 *    - Bunny CDN: $0.01 per GB (cheapest)
 *    - Imgix: Free tier with up to 100GB/month
 *    - Unsplash Pro: Unlimited API requests for stock photos
 * 
 * 5. STORAGE COST REDUCTION:
 *    - Use external image URLs or Cloudflare R2 objects, not local app storage
 *    - Store only image URLs in database (NULL storage costs)
 *    - Example: Store "https://unsplash.com/photos/xyz" instead of uploading file
 * 
 * ESTIMATED SAVINGS: 80-90% reduction in bandwidth costs
 */

/**
 * Batch optimize multiple images
 * @param {string[]} urls - Array of image URLs
 * @returns {string[]} Optimized URLs
 */
export function optimizeImageBatch(urls = []) {
  return urls.map(url => getOptimizedImageUrl(url, 400));
}
