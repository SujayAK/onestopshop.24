import { cart } from '../utils/cart.js';
import { getInventoryByProductIds } from '../utils/cloudflare.js';
import { showInfoPopup } from '../utils/ui-popup.js';

export function CartPage() {
  const items = cart.getItems();
  const total = cart.getTotal();

  if (items.length === 0) {
    return `
      <div class="container section cart-empty-state">
        <div class="cart-empty-content">
          <h1>Your Cart is Empty</h1>
          <p>Start shopping to add items to your cart.</p>
          <a href="#/shop" class="btn btn-primary">Continue Shopping</a>
        </div>
      </div>
    `;
  }

  const cartItemsHtml = items.map(item => `
    <div class="cart-item-card">
      <div class="cart-item-image-wrapper">
        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
      </div>
      
      <div class="cart-item-details">
        <h3 class="cart-item-name">${item.name}</h3>
        <p class="cart-item-category">${item.category}</p>
        <p class="cart-item-price">₹${item.price.toFixed(2)}</p>
      </div>

      <div class="cart-item-actions">
        <div class="cart-quantity-selector">
          <button class="qty-btn qty-decrease" data-product-id="${item.id}">-</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn qty-increase" data-product-id="${item.id}">+</button>
        </div>
        <p class="cart-item-total">₹${(item.price * item.quantity).toFixed(2)}</p>
        <button class="cart-item-remove btn-remove" data-product-id="${item.id}">Remove</button>
      </div>
    </div>
  `).join('');

  return `
    <div class="container section cart-page-container">
      <h1 class="cart-page-title">Shopping Cart</h1>

      <div class="cart-grid">
        <div class="cart-items-column">
          ${cartItemsHtml}
        </div>

        <div class="cart-summary-column">
          <div class="cart-summary-card">
            <h2>Order Summary</h2>
            
            <div class="cart-summary-lines">
              <div class="summary-line">
                <span>Subtotal</span>
                <span>₹${total.toFixed(2)}</span>
              </div>
              
              <div class="summary-line">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              
              <div class="summary-line">
                <span>Tax (10%)</span>
                <span>₹${(total * 0.1).toFixed(2)}</span>
              </div>
            </div>

            <div class="summary-total">
              <span>Total</span>
              <span>₹${(total * 1.1).toFixed(2)}</span>
            </div>

            <div class="cart-summary-actions">
              <button class="btn btn-primary checkout-btn" id="checkout-btn">Proceed to Checkout</button>
              <a href="#/shop" class="btn btn-outline continue-shopping-btn">Continue Shopping</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initCartPage() {
  // Remove item
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = parseInt(e.target.getAttribute('data-product-id'));
      cart.removeItem(productId);
      window.location.hash = '#/cart';
    });
  });

  // Update quantity
  document.querySelectorAll('.qty-increase').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const btnEl = e.currentTarget;
      const productIdRaw = btnEl.getAttribute('data-product-id');
      const productId = isNaN(parseInt(productIdRaw)) ? productIdRaw : parseInt(productIdRaw);
      const item = cart.getItems().find(i => String(i.id) === String(productId));
      
      if (!item) return;
      
      const newQuantity = item.quantity + 1;
      
      const originalText = btnEl.textContent;
      btnEl.textContent = '...';
      btnEl.disabled = true;
      
      try {
        const inventoryResult = await getInventoryByProductIds([productId]);
        
        if (inventoryResult.success && inventoryResult.data && inventoryResult.data.length > 0) {
          const stock = Number(inventoryResult.data[0].stock || 0);
          if (newQuantity > stock) {
            showInfoPopup(`Sorry, only ${stock} items available in stock.`);
            btnEl.textContent = originalText;
            btnEl.disabled = false;
            return;
          }
        }
        
        cart.updateQuantity(productId, newQuantity);
        window.location.hash = '#/cart';
      } catch (error) {
        console.error('Failed to check inventory', error);
        cart.updateQuantity(productId, newQuantity);
        window.location.hash = '#/cart';
      }
    });
  });

  document.querySelectorAll('.qty-decrease').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = parseInt(e.target.getAttribute('data-product-id'));
      const item = cart.getItems().find(i => i.id === productId);
      if (item.quantity > 1) {
        cart.updateQuantity(productId, item.quantity - 1);
        window.location.hash = '#/cart';
      }
    });
  });

  // Checkout
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      window.location.hash = '#/checkout';
    });
  }
}
