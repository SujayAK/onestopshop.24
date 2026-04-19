import { cart } from '../utils/cart.js';
import { updateOrder } from '../utils/cloudflare.js';

export function PaymentSuccessPage() {
  const lastPayment = JSON.parse(localStorage.getItem('lastPayment') || '{}');
  const currentOrder = JSON.parse(
    sessionStorage.getItem('currentOrder') || localStorage.getItem('currentOrder') || '{}'
  );

  return `
    <div class="container section payment-status-shell" style="max-width: 600px; margin: 4rem auto;">
      <div style="text-align: center;">
        <div style="font-size: 4rem; color: #4CAF50; margin-bottom: 1.5rem;">
          <i class="fas fa-check-circle"></i>
        </div>
        
        <h1 style="margin-bottom: 1rem; color: #4CAF50;">Payment Successful!</h1>
        
        <p style="color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.8;">
          Thank you for your purchase. Your order has been confirmed and is being processed.
        </p>

        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 2rem; border-radius: 4px; margin-bottom: 2rem; text-align: left;">
          <h2 style="margin-bottom: 1.5rem; font-size: 1.1rem; text-align: center;">Order Details</h2>
          
          <div class="payment-status-detail-row" style="margin-bottom: 1rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <span style="font-weight: 600;">Order ID:</span>
            <span>${currentOrder.orderId || 'N/A'}</span>
          </div>

          <div class="payment-status-detail-row" style="margin-bottom: 1rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <span style="font-weight: 600;">Payment ID:</span>
            <span style="font-size: 0.9rem; word-break: break-all;">${lastPayment.paymentId || 'N/A'}</span>
          </div>

          <div class="payment-status-detail-row" style="margin-bottom: 1rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <span style="font-weight: 600;">Amount:</span>
            <span style="color: var(--accent-pink); font-weight: 700;">₹${(currentOrder.amount || 0).toFixed(2)}</span>
          </div>

          <div class="payment-status-detail-row" style="margin-bottom: 1rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <span style="font-weight: 600;">Customer Name:</span>
            <span>${currentOrder.customerName || 'N/A'}</span>
          </div>

          <div class="payment-status-detail-row" style="margin-bottom: 1rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <span style="font-weight: 600;">Email:</span>
            <span>${currentOrder.customerEmail || 'N/A'}</span>
          </div>

          <div class="payment-status-detail-row" style="display: flex; justify-content: space-between; padding-bottom: 1rem;">
            <span style="font-weight: 600;">Date & Time:</span>
            <span>${new Date(lastPayment.timestamp).toLocaleString() || 'N/A'}</span>
          </div>
        </div>

        <div style="background: #E8F5E9; border-left: 4px solid #4CAF50; padding: 1.5rem; margin-bottom: 2rem; border-radius: 4px;">
          <p style="margin: 0; color: #2E7D32;">
            <strong>A confirmation email has been sent to ${currentOrder.customerEmail}</strong>
          </p>
          <p style="margin: 0.5rem 0 0 0; color: #2E7D32; font-size: 0.9rem;">
            You will receive tracking information once your order ships.
          </p>
        </div>

        <div class="payment-status-action-row" style="display: flex; gap: 1rem; justify-content: center;">
          <a href="#/" class="btn" style="text-decoration: none;">Back to Home</a>
          <a href="#/shop" class="btn btn-outline" style="text-decoration: none;">Continue Shopping</a>
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
