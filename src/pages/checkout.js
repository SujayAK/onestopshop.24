import { cart } from '../utils/cart.js';
import { razorpayPayment } from '../utils/razorpay.js';
import { createOrder, getCurrentUser, validateCoupon, redeemCoupon, getInventoryByProductIds, reserveInventory, releaseInventory } from '../utils/cloudflare.js';
import { showAuthRequiredPopup, showInfoPopup } from '../utils/ui-popup.js';

export function CheckoutPage() {
  const items = cart.getItems();
  const subtotal = cart.getTotal();
  const tax = subtotal * 0.1;
  const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 79;
  const total = subtotal + tax + shipping;

  if (items.length === 0) {
    return `
      <div class="container section" style="text-align: center;">
        <h1>Your cart is empty</h1>
        <a href="#/shop" class="btn" style="margin-top: 2rem;">Continue Shopping</a>
      </div>
    `;
  }

  const itemsSummary = items.map(item => `
    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
      <span>${item.name} x${item.quantity}</span>
      <span>₹${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');

  return `
    <div class="container section">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <a href="#/cart">Cart</a> / <span>Checkout</span>
      </div>

      <h1 style="margin-bottom: 3rem;">Checkout</h1>

      <div class="checkout-layout-grid">
        <div>
          <div class="checkout-form-panel">
            <h2 style="margin-bottom: 1.5rem; font-size: 1.2rem;">Billing Information</h2>
            
            <form id="checkout-form">
              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Full Name *</label>
                <input type="text" id="customer-name" placeholder="John Doe" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit;" required>
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Email Address *</label>
                <input type="email" id="customer-email" placeholder="john@example.com" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit;" required>
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Phone Number *</label>
                <input type="tel" id="customer-phone" placeholder="+91 9876543210" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit;" required>
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Address *</label>
                <input type="text" id="customer-address" placeholder="123 Main Street" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit;" required>
              </div>

              <div class="checkout-fields-grid">
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">City *</label>
                  <input type="text" id="customer-city" placeholder="New York" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit;" required>
                </div>
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Postal Code *</label>
                  <input type="text" id="customer-postal" placeholder="10001" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-family: inherit;" required>
                </div>
              </div>

              <div style="margin-bottom: 2rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                  <input type="checkbox" id="terms-checkbox" style="width: 18px; height: 18px; cursor: pointer;" required>
                  <span>I agree to the terms and conditions</span>
                </label>
              </div>
            </form>
          </div>

          <div class="checkout-actions-row">
            <a href="#/cart" class="btn btn-outline" style="flex: 1; text-align: center;">Back to Cart</a>
            <button id="proceed-payment-btn" class="btn" style="flex: 1;">Proceed to Payment</button>
          </div>
        </div>

        <div>
          <div class="checkout-summary-panel">
            <h2 style="margin-bottom: 1.5rem; font-size: 1.2rem;">Order Summary</h2>
            
            <div style="margin-bottom: 2rem; max-height: 300px; overflow-y: auto;">
              ${itemsSummary}
            </div>

            <div style="border-top: 2px solid var(--border-color); padding-top: 1.5rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; color: var(--text-secondary);">
                <span>Subtotal:</span>
                <span>₹${subtotal.toFixed(2)}</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem; color: var(--text-secondary);">
                <span>Tax Included (10%):</span>
                <span>₹${tax.toFixed(2)}</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem; color: var(--text-secondary);">
                <span>Shipping:</span>
                <span>${shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span>
              </div>

              <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.2rem; color: var(--accent-pink);">
                <span>Total Amount:</span>
                <span>₹${total.toFixed(2)}</span>
              </div>
            </div>

            <div style="background: var(--bg-secondary); padding: 1.5rem; margin-top: 2rem; border-radius: 4px;">
              <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <i class="fas fa-lock" style="color: var(--accent-purple);"></i>
                <span style="font-size: 0.85rem; font-weight: 600;">Secure Payment Powered by Razorpay</span>
              </div>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <i class="fas fa-check-circle" style="color: var(--accent-purple);"></i>
                <span style="font-size: 0.85rem;">All transactions are encrypted and secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initCheckoutPage() {
  const proceedBtn = document.getElementById('proceed-payment-btn');
  
  if (proceedBtn) {
    proceedBtn.addEventListener('click', async () => {
      // Validate form
      const form = document.getElementById('checkout-form');
      if (!form.checkValidity()) {
        showInfoPopup('Please fill in all required fields.');
        return;
      }

      // Check if user is logged in
      const userStr = sessionStorage.getItem('user');
      if (!userStr) {
        showAuthRequiredPopup('Sign in to complete your purchase and keep order tracking in your account.');
        return;
      }

      const user = JSON.parse(userStr);
      const name = document.getElementById('customer-name').value;
      const email = document.getElementById('customer-email').value;
      const phone = document.getElementById('customer-phone').value;
      const address = document.getElementById('customer-address').value;
      const city = document.getElementById('customer-city').value;
      const postal = document.getElementById('customer-postal').value;

      const items = cart.getItems();
      const subtotal = cart.getTotal();
      const tax = subtotal * 0.1;
      const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 79;
      const total = subtotal + tax + shipping;

      // Prepare shipping address
      const shippingAddress = {
        name,
        email,
        phone,
        address,
        city,
        postal_code: postal
      };

      try {
        proceedBtn.disabled = true;
        proceedBtn.textContent = 'Creating Order...';

        // Pre-check inventory to avoid placing orders for out-of-stock quantities.
        const inventoryResult = await getInventoryByProductIds(items.map(item => item.id));
        if (!inventoryResult.success) {
          showInfoPopup('Could not verify live inventory right now. Please try again.');
          proceedBtn.disabled = false;
          proceedBtn.textContent = 'Proceed to Payment';
          return;
        }

        const inventoryMap = new Map(
          (inventoryResult.data || []).map(row => [String(row.id), Number(row.stock || 0)])
        );

        const unavailableItem = items.find(item => {
          const stock = inventoryMap.get(String(item.id));
          return typeof stock === 'number' && item.quantity > stock;
        });

        if (unavailableItem) {
          showInfoPopup(`${unavailableItem.name} has only ${inventoryMap.get(String(unavailableItem.id)) || 0} left in stock. Please update your cart.`);
          window.location.hash = '#/cart';
          proceedBtn.disabled = false;
          proceedBtn.textContent = 'Proceed to Payment';
          return;
        }

        proceedBtn.textContent = 'Reserving Inventory...';
        const reserveResult = await reserveInventory(
          items.map(item => ({ id: item.id, quantity: item.quantity }))
        );

        if (!reserveResult.success || !reserveResult.data) {
          showInfoPopup('Some items just went out of stock. Please review your cart and try again.');
          window.location.hash = '#/cart';
          proceedBtn.disabled = false;
          proceedBtn.textContent = 'Proceed to Payment';
          return;
        }

        // Create order in Cloudflare D1
        const orderResult = await createOrder(
          user.id,
          items,
          total,
          shippingAddress
        );

        if (!orderResult.success) {
          await releaseInventory(items.map(item => ({ id: item.id, quantity: item.quantity })));
          showInfoPopup(`Failed to create order: ${orderResult.error}`);
          proceedBtn.disabled = false;
          proceedBtn.textContent = 'Proceed to Payment';
          return;
        }

        const orderId = orderResult.data.id;

        // Prepare Razorpay payment details
        const paymentDetails = {
          orderId: orderId,
          orderDBId: orderId,
          amount: total,
          currency: 'INR',
          storeName: 'onestopshop',
          description: 'Purchase from onestopshop',
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          products: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          customData: {
            address: address,
            city: city,
            postal: postal,
            user_id: user.id
          },
          inventoryReserved: true
        };

        // Store order details for payment verification
        sessionStorage.setItem('currentOrder', JSON.stringify(paymentDetails));
        localStorage.setItem('currentOrder', JSON.stringify(paymentDetails));

        proceedBtn.textContent = 'Loading Payment...';
        
        // Initiate Razorpay payment
        await razorpayPayment.initiatePayment(paymentDetails);
      } catch (error) {
        console.error('Checkout error:', error);
        showInfoPopup(`Error processing checkout: ${error.message}`);
        proceedBtn.disabled = false;
        proceedBtn.textContent = 'Proceed to Payment';
      }
    });
  }
}
