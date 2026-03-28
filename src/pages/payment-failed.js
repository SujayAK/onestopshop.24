import { releaseInventory, updateOrder } from '../utils/supabase.js';

export function PaymentFailedPage() {
  const lastError = JSON.parse(localStorage.getItem('lastPaymentError') || '{}');

  return `
    <div class="container section" style="max-width: 600px; margin: 4rem auto;">
      <div style="text-align: center;">
        <div style="font-size: 4rem; color: #f44336; margin-bottom: 1.5rem;">
          <i class="fas fa-times-circle"></i>
        </div>
        
        <h1 style="margin-bottom: 1rem; color: #f44336;">Payment Failed</h1>
        
        <p style="color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.8;">
          Unfortunately, your payment could not be processed. Please try again or use a different payment method.
        </p>

        ${lastError.errorCode ? `
          <div style="background: #FFEBEE; border: 1px solid #EF5350; padding: 1.5rem; border-radius: 4px; margin-bottom: 2rem; text-align: left;">
            <h2 style="margin-bottom: 1rem; font-size: 1rem; color: #f44336;">Error Details</h2>
            
            <div style="margin-bottom: 0.5rem;">
              <span style="font-weight: 600;">Error Code:</span>
              <span>${lastError.errorCode}</span>
            </div>

            <div>
              <span style="font-weight: 600;">Reason:</span>
              <span>${lastError.errorDescription}</span>
            </div>
          </div>
        ` : ''}

        <div style="background: #FFF3E0; border-left: 4px solid #FF9800; padding: 1.5rem; margin-bottom: 2rem; border-radius: 4px;">
          <p style="margin: 0; color: #E65100;">
            <strong>What can you do?</strong>
          </p>
          <ul style="margin: 1rem 0 0 1.5rem; color: #E65100; text-align: left;">
            <li>Check your payment details and try again</li>
            <li>Use a different payment method or card</li>
            <li>Ensure sufficient funds in your account</li>
            <li>Contact your bank if the issue persists</li>
          </ul>
        </div>

        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="#/checkout" class="btn" style="text-decoration: none;">Try Payment Again</a>
          <a href="#/cart" class="btn btn-outline" style="text-decoration: none;">Back to Cart</a>
          <a href="#/" class="btn btn-outline" style="text-decoration: none;">Back to Home</a>
        </div>
      </div>
    </div>
  `;
}

  export function initPaymentFailedPage() {
    const currentOrder = JSON.parse(sessionStorage.getItem('currentOrder') || '{}');

    if (currentOrder.inventoryReserved && Array.isArray(currentOrder.products)) {
      releaseInventory(
        currentOrder.products.map(item => ({ id: item.id, quantity: item.quantity }))
      ).catch(error => {
        console.error('Error releasing inventory in Supabase:', error);
      });
    }
  
    // Update order status to failed in Supabase
    if (currentOrder.orderDBId) {
      updateOrder(currentOrder.orderDBId, {
        status: 'failed',
        payment_status: 'failed',
        updated_at: new Date()
      }).catch(error => {
        console.error('Error updating order in Supabase:', error);
      });
    }

    sessionStorage.removeItem('currentOrder');
    localStorage.removeItem('currentOrder');
  }
