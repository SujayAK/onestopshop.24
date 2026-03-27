# Razorpay Payment Gateway Integration - Setup Guide

## Overview
This project is now integrated with Razorpay payment gateway, allowing customers to securely process payments for their online purchases.

## Features Implemented
- ✅ Shopping Cart Management
- ✅ Checkout Page with Customer Information
- ✅ Razorpay Payment Integration
- ✅ Payment Success & Failure Pages
- ✅ Order Summary & Tracking
- ✅ Cart Badge with Item Count

## Getting Started

### 1. Install Razorpay Account
- Visit [Razorpay Official Website](https://razorpay.com/)
- Create a free test account
- Get your API Keys from Dashboard → Settings → API Keys

### 2. Environment Configuration

Create a `.env` file in your project root:

```env
VITE_RAZORPAY_KEY_ID=your_test_key_id_here
```

Or update it in [src/utils/razorpay.js](src/utils/razorpay.js) line 7:
```javascript
this.keyId = config.keyId || 'your_test_key_id_here';
```

### 3. Project Structure

```
src/
├── utils/
│   ├── cart.js              # Cart management system
│   └── razorpay.js          # Razorpay payment handler
├── pages/
│   ├── cart.js              # Shopping cart page
│   ├── checkout.js          # Checkout form
│   ├── payment-success.js   # Success page
│   └── payment-failed.js    # Failure page
└── main.js                  # Updated routing
```

## Usage

### Adding Products to Cart
```javascript
import { cart } from './utils/cart.js';

// Add item to cart
const product = { id: 1, name: 'Product', price: 100 };
cart.addItem(product, quantity = 1);

// Remove item
cart.removeItem(productId);

// Update quantity
cart.updateQuantity(productId, newQuantity);

// Get cart total
const total = cart.getTotal();

// Get item count
const count = cart.getItemCount();
```

### Initiating Payment
```javascript
import { razorpayPayment } from './utils/razorpay.js';

const orderDetails = {
  orderId: 'ORD-12345',
  amount: 100, // In your currency
  currency: 'INR',
  storeName: 'Your Store',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: '+91 9876543210',
  products: [/* array of products */],
  customData: { /* any additional data */ }
};

await razorpayPayment.initiatePayment(orderDetails);
```

## Payment Flow

1. **Add to Cart** → Product added to localStorage
2. **View Cart** → Review items and proceed to checkout
3. **Checkout** → Fill shipping and billing information
4. **Payment** → Razorpay payment gateway opens
5. **Verification** → Payment verified on backend (optional)
6. **Success/Failure** → User redirected to appropriate page

## Testing Razorpay

### Test Cards (for development)
```
Success:
- Card Number: 4111 1111 1111 1111
- Expiry: Any future date
- CVV: Any 3 digits

Failed:
- Card Number: 4111 1111 1111 2222
- Expiry: Any future date
- CVV: Any 3 digits
```

## Backend Integration (Optional)

For production, implement payment verification on your backend:

### Node.js/Express Example
```javascript
import crypto from 'crypto';

app.post('/api/verify-payment', (req, res) => {
  const { paymentId, orderId, signature } = req.body;
  
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + '|' + paymentId)
    .digest('hex');

  if (generatedSignature === signature) {
    // Payment verified - update order in DB
    res.json({ status: 'verified', message: 'Payment verified successfully' });
  } else {
    res.status(400).json({ status: 'failed', message: 'Invalid signature' });
  }
});
```

### Python/Flask Example
```python
import hmac
import hashlib

@app.route('/api/verify-payment', methods=['POST'])
def verify_payment():
    payment_id = request.json.get('paymentId')
    order_id = request.json.get('orderId')
    signature = request.json.get('signature')
    
    generated_signature = hmac.new(
        os.getenv('RAZORPAY_KEY_SECRET').encode(),
        f'{order_id}|{payment_id}'.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if hmac.compare_digest(generated_signature, signature):
        # Payment verified - update order in DB
        return {'status': 'verified', 'message': 'Payment verified successfully'}
    else:
        return {'status': 'failed', 'message': 'Invalid signature'}, 400
```

## localStorage Keys

The following localStorage keys are used:

- `cart` - JSON array of cart items
- `lastPayment` - Last successful payment details
- `lastPaymentError` - Last payment error details
- `currentOrder` - Current order being processed

## Event Listeners

You can listen for payment events:

```javascript
window.addEventListener('cartUpdated', () => {
  console.log('Cart was updated');
});

window.addEventListener('paymentSuccess', (e) => {
  console.log('Payment successful:', e.detail);
});

window.addEventListener('paymentFailed', (e) => {
  console.log('Payment failed:', e.detail);
});

window.addEventListener('paymentDismissed', (e) => {
  console.log('Payment was dismissed:', e.detail);
});
```

## Production Requirements

1. **API Keys**: Replace test keys with live Razorpay keys
2. **Backend Server**: Implement payment verification endpoint
3. **HTTPS**: Ensure your site runs on HTTPS in production
4. **Database**: Store orders and payment records
5. **Email Notifications**: Send order confirmation emails
6. **Security**: Implement CSRF protection, input validation
7. **Error Handling**: Add comprehensive logging and error tracking

## Troubleshooting

### Script Not Loading
- Check if Razorpay CDN is accessible
- Verify network connectivity
- Check browser console for errors

### Payment Button Not Working
- Ensure all form fields are filled
- Check if payment amount is valid
- Verify Razorpay key is set correctly

### Cart Not Persisting
- Check if localStorage is enabled
- Verify browser isn't in private mode
- Check storage capacity

## Support & Documentation

- [Razorpay API Documentation](https://razorpay.com/docs/api/)
- [Razorpay Checkout Documentation](https://razorpay.com/docs/checkout/web/)
- [Razorpay Integration Guides](https://razorpay.com/docs/integration/)

## Security Notes

⚠️ **Important for Production:**
- Never commit `.env` files with real API keys
- Use environment variables for sensitive data
- Implement rate limiting on backend
- Validate all payment data on the server side
- Use HTTPS/TLS for all communications
- Implement proper error logging without exposing sensitive info
- Keep payment verification logic server-side only
