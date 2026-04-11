export class RazorpayPayment {
  constructor(config = {}) {
    this.keyId =
      config.keyId ||
      import.meta.env.VITE_RAZORPAY_KEY_ID ||
      '';
    this.successUrl = config.successUrl || '#/payment-success';
    this.failureUrl = config.failureUrl || '#/payment-failed';
  }

  async initiatePayment(orderDetails) {
    try {
      return await this.openDummyCheckout(orderDetails);
    } catch (error) {
      console.error('Payment initiation error:', error);
      return { status: 'error', message: error.message };
    }
  }

  openDummyCheckout(orderDetails) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'dummy-razorpay-overlay';
      overlay.innerHTML = `
        <div class="dummy-razorpay-modal" role="dialog" aria-modal="true" aria-labelledby="dummy-razorpay-title">
          <h2 id="dummy-razorpay-title">Test Razorpay Checkout</h2>
          <p>Use this simulator to verify the order flow before going live.</p>
          <div class="dummy-razorpay-summary">
            <div><span>Order</span><strong>${orderDetails.orderId}</strong></div>
            <div><span>Amount</span><strong>₹${Number(orderDetails.amount || 0).toFixed(2)}</strong></div>
            <div><span>Customer</span><strong>${orderDetails.customerName || ''}</strong></div>
          </div>
          <div class="dummy-razorpay-actions">
            <button type="button" class="btn" data-action="success">Pay Test Success</button>
            <button type="button" class="btn btn-outline" data-action="failure">Pay Test Failure</button>
            <button type="button" class="dummy-razorpay-dismiss" data-action="dismiss">Cancel</button>
          </div>
        </div>
      `;

      const cleanup = () => overlay.remove();

      overlay.addEventListener('click', event => {
        if (event.target === overlay) {
          cleanup();
          this.handlePaymentDismiss(orderDetails);
          resolve({ status: 'dismissed' });
        }
      });

      overlay.querySelector('[data-action="success"]').addEventListener('click', () => {
        cleanup();
        const response = {
          razorpay_payment_id: `pay_${Date.now()}`,
          razorpay_order_id: String(orderDetails.orderId || `order_${Date.now()}`),
          razorpay_signature: `sig_${Math.random().toString(36).slice(2, 12)}`
        };
        this.handlePaymentSuccess(response, orderDetails);
        resolve({ status: 'success' });
      });

      overlay.querySelector('[data-action="failure"]').addEventListener('click', () => {
        cleanup();
        this.handlePaymentFailed({ error: { code: 'TEST_PAYMENT_FAILED', description: 'This is a dummy failure for checkout testing.' } }, orderDetails);
        resolve({ status: 'failed' });
      });

      overlay.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
        cleanup();
        this.handlePaymentDismiss(orderDetails);
        resolve({ status: 'dismissed' });
      });

      document.body.appendChild(overlay);
    });
  }

  handlePaymentSuccess(response, orderDetails) {
    console.log('Payment Successful:', response);
    
    const paymentData = {
      paymentId: response.razorpay_payment_id,
      orderId: response.razorpay_order_id,
      signature: response.razorpay_signature,
      orderDetails: orderDetails,
      timestamp: new Date().toISOString(),
      status: 'success'
    };

    // Store payment data
    localStorage.setItem('lastPayment', JSON.stringify(paymentData));
    
    // Emit success event
    window.dispatchEvent(new CustomEvent('paymentSuccess', { detail: paymentData }));
    
    // Redirect to success page
    window.location.hash = '#/payment-success';
  }

  handlePaymentFailed(response, orderDetails) {
    console.error('Payment Failed:', response);
    
    const errorData = {
      errorCode: response.error.code,
      errorDescription: response.error.description,
      orderDetails: orderDetails,
      timestamp: new Date().toISOString(),
      status: 'failed'
    };

    // Store error data
    localStorage.setItem('lastPaymentError', JSON.stringify(errorData));
    
    // Emit failure event
    window.dispatchEvent(new CustomEvent('paymentFailed', { detail: errorData }));
    
    // Redirect to failure page
    window.location.hash = '#/payment-failed';
  }

  handlePaymentDismiss(orderDetails) {
    console.warn('Payment dismissed');
    const errorData = {
      errorCode: 'PAYMENT_DISMISSED',
      errorDescription: 'Payment was cancelled by the user.',
      orderDetails: orderDetails,
      timestamp: new Date().toISOString(),
      status: 'failed'
    };

    localStorage.setItem('lastPaymentError', JSON.stringify(errorData));
    window.dispatchEvent(new CustomEvent('paymentDismissed', { detail: orderDetails }));
    window.location.hash = '#/payment-failed';
  }

  // Verify payment on backend (call from your server)
  async verifyPayment(paymentData) {
    try {
      // This should be called from your backend in production
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      return await response.json();
    } catch (error) {
      console.error('Payment verification error:', error);
      return { status: 'error', message: error.message };
    }
  }
}

export const razorpayPayment = new RazorpayPayment();
