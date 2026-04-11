/**
 * Product Display & Grid Layout Utility
 * Efficient product arrangement for e-commerce
 */

/**
 * Generate responsive product grid HTML
 * Auto-adjusts columns based on screen size (mobile-first)
 * 
 * @param {object[]} products - Array of product objects
 * @param {string} containerClass - CSS class for container
 * @returns {string} HTML markup
 */
export function createResponsiveProductGrid(products = [], containerClass = 'product-grid') {
  return `
    <div class="${containerClass}" role="grid" aria-label="Products">
      ${products.map((product, index) => `
        <div role="gridcell" aria-rowindex="${Math.floor(index / 4) + 1}" aria-colindex="${(index % 4) + 1}">
          ${createProductCard(product)}
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Create optimized product card with lazy-loaded image
 * (Ready to use with image-optimization.js)
 * 
 * @param {object} product - Product data
 * @returns {string} HTML markup
 */
export function createProductCard(product = {}) {
  const {
    id,
    name,
    price,
    image,
    category,
    stock,
    discount
  } = product;

  const placeholderImage = 'https://via.placeholder.com/300x300?text=Product';
  const productImage = image || placeholderImage;

  return `
    <div class="product-card" data-product-id="${id}">
      <!-- Image Container with Badge -->
      <div class="product-image-wrapper">
        <img 
          class="product-image lazy-image"
          src="${placeholderImage}"
          data-src="${productImage}"
          alt="${name}"
          loading="lazy"
        />
        ${discount ? `<span class="discount-badge">-${discount}%</span>` : ''}
        ${!stock || stock <= 0 ? '<span class="out-of-stock-badge">Out of Stock</span>' : ''}
      </div>

      <!-- Product Info -->
      <div class="product-info">
        <p class="product-category">${category || 'Product'}</p>
        <h3 class="product-name">${name}</h3>
        
        <!-- Price Section -->
        <div class="product-price">
          <span class="price">₹${Number(price || 0).toFixed(2)}</span>
        </div>

        <!-- Stock Indicator -->
        <p class="stock-indicator" data-stock-label data-product-id="${id}">
          ${getStockText(stock)}
        </p>

        <!-- Action Buttons -->
        <div class="product-actions">
          <button class="btn add-to-cart-btn" data-product-id="${id}">
            Add to Cart
          </button>
          <button class="btn btn-outline wishlist-toggle" data-product-id="${id}">
            ♡ Wishlist
          </button>
        </div>

        <!-- View Details Link -->
        <a href="#/product/${id}" class="btn btn-text">
          View Details →
        </a>
      </div>
    </div>
  `;
}

/**
 * Get localized stock text
 */
function getStockText(stock) {
  const parsed = Number(stock);
  if (!Number.isFinite(parsed) || parsed === null) return 'In stock';
  if (parsed <= 0) return 'Out of stock';
  if (parsed <= 3) return `Only ${parsed} left!`;
  return 'In stock';
}

/**
 * CSS GRID SYSTEM FOR RESPONSIVE PRODUCT LAYOUT
 * Add this to your CSS file (src/styles/main.css or product-grid.css)
 * 
 * MIN-WIDTH (Mobile First) APPROACH:
 * - 320px (mobile)     → 1-2 columns
 * - 640px (tablet)     → 2 columns  
 * - 1024px (laptop)    → 3-4 columns
 * - 1440px (desktop)   → 4-5 columns
 */

export const RESPONSIVE_GRID_CSS = `
/* Product Grid Container */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  width: 100%;
  padding: 0;
  list-style: none;
}

/* MOBILE (320px - 640px) */
@media (max-width: 640px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

/* TABLET (641px - 1024px) */
@media (min-width: 641px) and (max-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
}

/* DESKTOP (1025px+) */
@media (min-width: 1025px) {
  .product-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }
}

/* LARGE DESKTOP (1440px+) */
@media (min-width: 1440px) {
  .product-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 2rem;
  }
}

/* Product Card Styling */
.product-card {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.12);
}

.product-image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #f5f5f5;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.product-image.loaded {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Discount Badge */
.discount-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ff4757;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 10;
}

/* Out of Stock Badge */
.out-of-stock-badge {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.7);
  color: white;
  font-weight: 600;
  z-index: 5;
}

/* Product Info Section */
.product-info {
  padding: 1.25rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-category {
  font-size: 0.75rem;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.product-name {
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.75rem;
  line-height: 1.4;
  min-height: 2.8em;
}

.product-price {
  margin-bottom: 0.5rem;
}

.price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ff69b4;
}

.original-price {
  text-decoration: line-through;
  color: #999;
  margin-left: 0.5rem;
  font-size: 0.9rem;
}

.stock-indicator {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 1rem;
}

.stock-indicator.is-low {
  color: #ff9800;
  font-weight: 600;
}

.stock-indicator.is-out {
  color: #ff4757;
  font-weight: 600;
}

/* Product Actions */
.product-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.product-actions button {
  flex: 1;
  min-width: 120px;
  padding: 0.75rem;
  font-size: 0.875rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-to-cart-btn {
  background: #ff69b4;
  color: white;
  font-weight: 600;
}

.add-to-cart-btn:hover {
  background: #ff1493;
  transform: translateY(-2px);
}

.btn-outline {
  background: white;
  border: 2px solid #ff69b4;
  color: #ff69b4;
  font-weight: 600;
}

.btn-outline:hover {
  background: #fff0f5;
  transform: translateY(-2px);
}

.btn-text {
  background: none;
  padding: 0;
  color: #ff69b4;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.3s ease;
}

.btn-text:hover {
  color: #ff1493;
  text-decoration: underline;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .product-info {
    padding: 1rem;
  }
  
  .product-name {
    font-size: 0.95rem;
  }
  
  .product-actions {
    gap: 0.5rem;
  }
  
  .product-actions button {
    min-width: 100px;
    padding: 0.6rem;
    font-size: 0.75rem;
  }
}
`;

/**
 * IMPLEMENTATION GUIDE
 * 
 * 1. Add this CSS to your stylesheet:
 *    import { RESPONSIVE_GRID_CSS } from './product-layout.js';
 *    // Then inject it into <style> tag
 * 
 * 2. In your page component (e.g., shop.js):
 *    import { createResponsiveProductGrid } from './product-layout.js';
 *    const grid = createResponsiveProductGrid(products);
 *    document.getElementById('products').innerHTML = grid;
 * 
 * 3. Initialize lazy loading AFTER rendering:
 *    import { initLazyLoading } from '../utils/image-optimization.js';
 *    initLazyLoading();
 */
