import products from '../data/products.json';
import { cart } from '../utils/cart.js';

export function ProductPage(id) {
  const product = products.find(p => p.id === parseInt(id));

  if (!product) {
    return `
      <section class="section">
        <div class="container" style="text-align: center;">
          <h1>Product Not Found</h1>
          <a href="#/shop" class="btn">Back to Shop</a>
        </div>
      </section>
    `;
  }

  const detailsHtml = Object.entries(product.details)
    .map(([key, value]) => `
      <div style="border-bottom: 1px solid var(--border-color); padding: 10px 0; display: flex; justify-content: space-between;">
        <span style="font-weight: 600; text-transform: uppercase; font-size: 0.8rem; color: var(--text-secondary);">${key}</span>
        <span style="font-size: 0.9rem;">${value}</span>
      </div>
    `).join('');

  return `
    <div class="container section">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <a href="#/shop">Shop</a> / <a href="#/shop?cat=${product.category}">${product.category}</a> / <span>${product.name}</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: var(--spacing-lg); align-items: start;">
        <div class="product-gallery">
          <img src="${product.image}" alt="${product.name}" style="width: 100%; border: 1px solid var(--border-color); display: block;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px;">
            <div style="aspect-ratio: 1/1; background: #eee; border: 1px solid var(--border-color);"></div>
            <div style="aspect-ratio: 1/1; background: #eee; border: 1px solid var(--border-color);"></div>
            <div style="aspect-ratio: 1/1; background: #eee; border: 1px solid var(--border-color);"></div>
          </div>
        </div>

        <div class="product-info" style="background: var(--bg-primary); padding: var(--spacing-md); border: 1px solid var(--border-color);">
          <p style="color: var(--accent-pink); font-weight: 600; text-transform: uppercase; letter-spacing: 2px; font-size: 0.8rem; margin-bottom: 0.5rem;">${product.category}</p>
          <h1 style="margin-bottom: 1rem;">${product.name}</h1>
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
            <h2 style="margin-bottom: 0; color: var(--text-primary);">$${product.price.toFixed(2)}</h2>
            <span style="color: var(--accent-pink); font-size: 0.9rem; font-weight: 600;">(In Stock)</span>
          </div>
          
          <p style="margin-bottom: 2rem; color: var(--text-secondary); line-height: 1.8;">${product.description}</p>
          
          <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 1px; font-size: 0.9rem; border-bottom: 2px solid var(--accent-pink); display: inline-block;">Product Details</h4>
            <div style="margin-top: 0.5rem;">
              ${detailsHtml}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1rem; margin-bottom: 2rem;">
             <input type="number" id="product-qty" value="1" min="1" style="padding: 12px; border: 1px solid var(--border-color); text-align: center; font-family: inherit;">
             <button id="add-to-cart-btn" class="btn" style="width: 100%;">Add to Cart</button>
          </div>

          <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
              <i class="fas fa-shipping-fast" style="color: var(--accent-purple);"></i>
              <span style="font-size: 0.85rem; font-weight: 600;">Fast & Secure Shipping</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
              <i class="fas fa-shield-alt" style="color: var(--accent-purple);"></i>
              <span style="font-size: 0.85rem; font-weight: 600;">100% Secure Checkout</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <i class="fas fa-camera" style="color: var(--accent-purple);"></i>
              <span style="font-size: 0.85rem; font-weight: 600;">Real Product Photos Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top: var(--spacing-xl);">
        <h2 style="text-align: center; margin-bottom: 3rem;">You May Also Like</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem;">
           <!-- Featured products placeholders -->
           <div class="product-card" style="opacity: 0.5;">Related Product 1</div>
           <div class="product-card" style="opacity: 0.5;">Related Product 2</div>
           <div class="product-card" style="opacity: 0.5;">Related Product 3</div>
        </div>
      </div>
    </div>
  `;
}

export function initProductPage(productId) {
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const qtyInput = document.getElementById('product-qty');

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const product = products.find(p => p.id === parseInt(productId));
      const quantity = parseInt(qtyInput.value) || 1;

      if (product) {
        cart.addItem(product, quantity);
        alert('Product added to cart!');
        // Optionally navigate to cart
        // window.location.hash = '#/cart';
      }
    });
  }
}
