// Razorpay Payment Gateway Integration
export class RazorpayPayment {
  constructor(config = {}) {
    this.keyId = config.keyId || process.env.VITE_RAZORPAY_KEY_ID;
    this.successUrl = config.successUrl || '#/payment-success';
    this.failureUrl = config.failureUrl || '#/payment-failed';
  }

  loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      
      document.head.appendChild(script);
    });
  }

  async initiatePayment(orderDetails) {
    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        await this.loadRazorpayScript();
      }

      const options = {
        key: this.keyId || 'rzp_test_1DP5mmOlF5G5ag', // Test key - replace with actual
        amount: Math.round(orderDetails.amount * 100), // Amount in paise
        currency: orderDetails.currency || 'INR',
        name: orderDetails.storeName || 'OneStop Shop 24',
        description: orderDetails.description || 'Purchase products',
        order_id: orderDetails.orderId, // Order ID from backend (optional)
        image: '/logo_updated.png', // Your logo
        prefill: {
          name: orderDetails.customerName || '',
          email: orderDetails.customerEmail || '',
          contact: orderDetails.customerPhone || ''
        },
        notes: {
          orderId: orderDetails.orderId,
          products: orderDetails.products || [],
          customData: orderDetails.customData || {}
        },
        handler: (response) => this.handlePaymentSuccess(response, orderDetails),
        modal: {
          ondismiss: () => this.handlePaymentDismiss(orderDetails)
        },
        // Optional: Add theme colors
        theme: {
          color: '#8B5A9C' // Your brand color
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => this.handlePaymentFailed(response, orderDetails));
      rzp.open();

      return { status: 'initiated' };
    } catch (error) {
      console.error('Payment initiation error:', error);
      return { status: 'error', message: error.message };
    }
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
    window.dispatchEvent(new CustomEvent('paymentDismissed', { detail: orderDetails }));
  }

  // Verify payment on backend (call from your server)
  async verifyPayment(paymentData) {
    try {
      // This should be called from your backend
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
