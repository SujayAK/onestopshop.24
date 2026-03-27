# Quick Start Guide - Razorpay Integration

## 🚀 Getting Started in 5 Minutes

### Step 1: Update Vite Config (if needed)
Your project already supports environment variables through Vite. The setup is ready to go!

### Step 2: Test the Payment Flow

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the shop:**
   - Go to http://localhost:5173 (or your dev server URL)
   - Click on any product

3. **Add to Cart:**
   - Click "Add to Cart" button
   - Notice the cart badge updates

4. **Checkout:**
   - Click cart icon in navbar
   - Click "Proceed to Checkout"
   - Fill in your details
   - Click "Proceed to Payment"

5. **Complete Payment:**
   - Razorpay modal will open
   - Use test card: `4111 1111 1111 1111`
   - Any future expiry date and any 3-digit CVV
   - Complete the payment

### Step 3: Test Both Scenarios

**Success Case:**
- Use card: 4111 1111 1111 1111
- You'll see the success page with order details

**Failure Case:**
- Use card: 4111 1111 1111 2222
- You'll see the failure page with retry option

## 📁 File Structure

```
onestop/
├── src/
│   ├── pages/
│   │   ├── cart.js              ← Shopping cart
│   │   ├── checkout.js          ← Checkout form
│   │   ├── payment-success.js   ← Success page
│   │   └── payment-failed.js    ← Failure page
│   ├── utils/
│   │   ├── cart.js              ← Cart management
│   │   └── razorpay.js          ← Razorpay integration
│   ├── components/
│   │   └── navbar.js            ← Updated with cart badge
│   └── main.js                  ← Updated routing
├── RAZORPAY_SETUP.md            ← Detailed setup guide
├── server-example.js            ← Backend example (Node.js)
├── server-example.py            ← Backend example (Python)
└── .env                         ← Test keys (dev only)
```

## 🧪 Test Workflows

### Workflow 1: Basic Purchase
```
Shop → View Product → Add to Cart → Cart → Checkout → Payment → Success
```

### Workflow 2: Update Cart
```
Add Item → View Cart → Update Quantity → Remove Item → Checkout → Payment
```

### Workflow 3: Payment Failure Handling
```
Checkout → Payment Fails → Retry → Payment Success
```

## 💳 Test Payment Methods

### Cards (Indian):
- **Success:** 4111 1111 1111 1111
- **Failure:** 4111 1111 1111 2222
- **3D Secure:** 4012001038443335

### Expire details (any future date):
- Month: 12
- Year: 2025 (or later)
- CVV: 123 (any 3 digits)

## 🔑 API Endpoints (Optional Backend)

If you implement the backend servers:

```
POST   /api/verify-payment       - Verify payment signature
POST   /api/create-order         - Create Razorpay order
POST   /api/capture-payment      - Capture held payment
POST   /api/refund-payment       - Refund a payment
GET    /api/payment/:paymentId   - Get payment details
```

## 📝 Key Features Implemented

✅ Shopping cart with localStorage persistence  
✅ Add/remove/update cart items  
✅ Cart quantity badge in navbar  
✅ Checkout form with customer info  
✅ Razorpay payment gateway integration  
✅ Payment success/failure handling  
✅ Order summary and tracking  
✅ Order data stored in localStorage  

## 🐛 Troubleshooting

### Cart not showing items?
- Check browser localStorage (DevTools → Application → Local Storage)
- Clear localStorage and try again

### Payment modal not opening?
- Check browser console for errors
- Verify internet connection
- Reload the page and try again

### Test card not working?
- Ensure you're using exact test card numbers
- Check expiry date is in the future
- Try different payment method in the modal

## 🔒 Important for Production

Before going live:

1. **Replace Test Keys** in `.env`
   ```
   VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
   ```

2. **Implement Backend Verification** (see `server-example.js` or `server-example.py`)

3. **Enable HTTPS** on your domain

4. **Update API URLs** to your production backend

5. **Add Database Integration** for order persistence

6. **Implement Email Notifications**

7. **Set Up Error Logging** and monitoring

## 📚 Documentation

- Full setup guide: [RAZORPAY_SETUP.md](./RAZORPAY_SETUP.md)
- Razorpay Docs: https://razorpay.com/docs/
- Checkout Integration: https://razorpay.com/docs/checkout/web/

## 💡 Next Steps

1. Test the current implementation with test cards
2. Set up your backend server for payment verification
3. Add database integration for storing orders
4. Implement email notifications
5. Get live Razorpay keys from dashboard
6. Deploy to production with HTTPS

Happy selling! 🎉
