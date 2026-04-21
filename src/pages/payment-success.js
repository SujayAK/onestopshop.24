import { cart } from '../utils/cart.js';
import { updateOrder } from '../utils/cloudflare.js';

export function PaymentSuccessPage() {
  const lastPayment = JSON.parse(localStorage.getItem('lastPayment') || '{}');
  const currentOrder = JSON.parse(
    sessionStorage.getItem('currentOrder') || localStorage.getItem('currentOrder') || '{}'
  );

  const items = currentOrder.items || currentOrder.products || [];
  const shippingAddress = currentOrder.shippingAddress || currentOrder.customData || {};

  const itemsHTML = items.length > 0 ? items.map(item => `
    <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
      <div>
        <div>${item.name || 'Product'}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">Qty: ${item.quantity || 1}</div>
      </div>
      <div style="text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</div>
    </div>
  `).join('') : '<div style="color: var(--text-secondary);">No items</div>';

  const shippingHTML = shippingAddress && Object.keys(shippingAddress).length > 0 ? `
    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
      <h3 style="margin-bottom: 0.75rem; font-size: 0.95rem;">Delivery Address</h3>
      <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-secondary);">
        <div>${shippingAddress.name || shippingAddress.address || ''}</div>
        <div>${shippingAddress.address || ''}</div>
        <div>${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.postal_code || shippingAddress.postal || ''}</div>
        <div style="margin-top: 0.5rem;">Phone: ${shippingAddress.phone || 'N/A'}</div>
      </div>
    </div>
  ` : '';

  return `
    <div class="container section payment-status-shell" style="max-width: 700px; margin: 4rem auto;">
      <div style="text-align: center;">
        <div style="font-size: 4rem; color: #4CAF50; margin-bottom: 1.5rem;">
          <i class="fas fa-check-circle"></i>
        </div>
        
        <h1 style="margin-bottom: 0.5rem; color: #4CAF50;">Payment Successful!</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Your order has been confirmed and is being processed.</p>

        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 2rem; border-radius: 4px; margin-bottom: 2rem; text-align: left;">
          <h2 style="margin-bottom: 1.5rem; font-size: 1.1rem; text-align: center;">Order Confirmation</h2>
          
          <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <span style="font-weight: 600;">Order ID:</span>
            <span style="font-family: monospace;">${currentOrder.orderId || 'N/A'}</span>
          </div>

          <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <span style="font-weight: 600;">Payment ID:</span>
            <span style="font-size: 0.85rem; word-break: break-all; font-family: monospace;">${lastPayment.paymentId || 'N/A'}</span>
          </div>

          <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: 4px;">
            <h3 style="margin-bottom: 1rem; font-size: 0.95rem; color: var(--text-secondary);">Items Ordered</h3>
            ${itemsHTML}
          </div>

          <div style="margin-bottom: 1rem; padding-top: 1rem; border-top: 2px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
              <span>Subtotal:</span>
              <span>₹${(currentOrder.amount ? currentOrder.amount / 1.1 : 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; color: var(--text-secondary);">
              <span>Tax (10%):</span>
              <span>₹${(currentOrder.amount ? currentOrder.amount - (currentOrder.amount / 1.1) : 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.1rem; color: var(--accent-pink);">
              <span>Total Amount:</span>
              <span>₹${(currentOrder.amount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div style="margin-bottom: 1rem; padding: 1rem; background: #F5F5F5; border-radius: 4px;">
            <div style="margin-bottom: 0.5rem;"><strong>Customer Email:</strong> ${currentOrder.customerEmail || 'N/A'}</div>
            <div><strong>Order Date:</strong> ${new Date(lastPayment.timestamp).toLocaleString() || 'N/A'}</div>
          </div>

          ${shippingHTML}
        </div>

        <div style="background: #E8F5E9; border-left: 4px solid #4CAF50; padding: 1.5rem; margin-bottom: 2rem; border-radius: 4px;">
          <p style="margin: 0; color: #2E7D32; font-weight: 600;">✓ Confirmation email sent</p>
          <p style="margin: 0.5rem 0 0 0; color: #2E7D32; font-size: 0.9rem;">
            A detailed confirmation has been sent to <strong>${currentOrder.customerEmail}</strong>. You'll receive tracking information once your order ships.
          </p>
        </div>

        <div style="background: #FFF3E0; border-left: 4px solid #FF9800; padding: 1.5rem; margin-bottom: 2rem; border-radius: 4px;">
          <p style="margin: 0; color: #E65100; font-weight: 600;">📦 What's Next?</p>
          <ul style="margin: 0.75rem 0 0 0; padding-left: 1.5rem; color: #E65100; font-size: 0.9rem;">
            <li>Your order is being prepared for packaging</li>
            <li>We'll notify you via email when it ships</li>
            <li>Expected delivery in 3-5 business days</li>
          </ul>
        </div>

        <div class="payment-status-action-row" style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="#/" class="btn" style="text-decoration: none;">Back to Home</a>
          <a href="#/shop" class="btn btn-outline" style="text-decoration: none;">Continue Shopping</a>
          <a href="#/profile" class="btn btn-outline" style="text-decoration: none;">View Orders</a>
        </div>
      </div>
    </div>
  `;
}

export function initPaymentSuccessPage() {
  const currentOrder = JSON.parse(
    sessionStorage.getItem('currentOrder') || localStorage.getItem('currentOrder') || '{}'
  );
  
  // Update order status in Cloudflare D1
  if (currentOrder.orderDBId) {
    updateOrder(currentOrder.orderDBId, {
      status: 'confirmed',
      payment_status: 'completed',
      razorpay_payment_id: currentOrder.razorpayPaymentId || '',
      razorpay_order_id: currentOrder.razorpayOrderId || '',
      updated_at: new Date()
    }).catch(error => {
      console.error('Error updating order in Cloudflare:', error);
    });
  }

  // Clear cart after successful payment
  cart.clear();
  sessionStorage.removeItem('currentOrder');
  localStorage.removeItem('currentOrder');
}
