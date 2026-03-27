import { cart } from '../utils/cart.js';

export function CartPage() {
  const items = cart.getItems();
  const total = cart.getTotal();

  if (items.length === 0) {
    return `
      <div class="container section" style="text-align: center;">
        <h1 style="margin-bottom: 2rem;">Your Cart is Empty</h1>
        <p style="margin-bottom: 3rem; color: var(--text-secondary);">Start shopping to add items to your cart.</p>
        <a href="#/shop" class="btn">Continue Shopping</a>
      </div>
    `;
  }

  const cartItemsHtml = items.map(item => `
    <div style="display: grid; grid-template-columns: 100px 1fr auto; gap: 2rem; align-items: center; padding: 2rem; border-bottom: 1px solid var(--border-color);">
      <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100px; object-fit: cover; border: 1px solid var(--border-color);">
      
      <div>
        <h3 style="margin-bottom: 0.5rem;">${item.name}</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">${item.category}</p>
        <p style="color: var(--accent-pink); font-weight: 700;">$${item.price.toFixed(2)}</p>
      </div>

      <div style="text-align: right;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
          <button class="qty-decrease" data-product-id="${item.id}" style="padding: 5px 10px; border: 1px solid var(--border-color); background: var(--bg-primary); cursor: pointer;">-</button>
          <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
          <button class="qty-increase" data-product-id="${item.id}" style="padding: 5px 10px; border: 1px solid var(--border-color); background: var(--bg-primary); cursor: pointer;">+</button>
        </div>
        <p style="font-weight: 700; margin-bottom: 1rem;">$${(item.price * item.quantity).toFixed(2)}</p>
        <button class="btn-remove" data-product-id="${item.id}" style="background: none; border: none; color: var(--accent-pink); cursor: pointer; text-decoration: underline;">Remove</button>
      </div>
    </div>
  `).join('');

  return `
    <div class="container section">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <span>Cart</span>
      </div>

      <h1 style="margin-bottom: 3rem;">Shopping Cart</h1>

      <div style="display: grid; grid-template-columns: 1fr 350px; gap: 3rem;">
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color);">
          ${cartItemsHtml}
        </div>

        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 2rem; height: fit-content;">
          <h2 style="margin-bottom: 2rem; font-size: 1.3rem;">Order Summary</h2>
          
          <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
              <span>Subtotal:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
              <span>Shipping:</span>
              <span>$0.00</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
              <span>Tax (10%):</span>
              <span>$${(total * 0.1).toFixed(2)}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; font-weight: 700; font-size: 1.2rem;">
            <span>Total:</span>
            <span>$${(total * 1.1).toFixed(2)}</span>
          </div>

          <button class="btn" id="checkout-btn" style="width: 100%; margin-bottom: 1rem;">Proceed to Checkout</button>
          <a href="#/shop" class="btn btn-outline" style="width: 100%; text-align: center;">Continue Shopping</a>
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
    btn.addEventListener('click', (e) => {
      const productId = parseInt(e.target.getAttribute('data-product-id'));
      const item = cart.getItems().find(i => i.id === productId);
      cart.updateQuantity(productId, item.quantity + 1);
      window.location.hash = '#/cart';
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
