# Complete Payment Implementation Guide

## Overview
This document covers the complete payment system implementation for OneStop Shop including Razorpay integration, stock management, order processing, and email notifications.

## Features Implemented

### 1. **Razorpay Payment Integration** ✅
- **File**: `src/utils/razorpay.js`
- **Key Features**:
  - Support for both real Razorpay (production) and dummy checkout (development)
  - Real checkout uses Razorpay script loading and live payment gateway
  - Dummy checkout for testing without live keys
  - Placeholder support: `rzp_test_placeholder_key`
  - Configurable key via environment variable: `VITE_RAZORPAY_KEY_ID`
  - Order creation and payment verification
  - Payment success/failure/dismissal handlers

### 2. **Enhanced Checkout Form** ✅
- **File**: `src/pages/checkout.js`
- **New Fields Added**:
  - Full Name
  - Email Address
  - Phone Number (will be used for future features)
  - Address
  - City
  - **State** (NEW)
  - Postal Code/PIN Code
  - Terms & Conditions checkbox
  
- **Form Validation**: All fields required before payment
- **Layout**: Two-column layout with order summary on the right

### 3. **Order Confirmation Email** ✅
- **File**: `src/utils/email.js`
- **Functions Added**:
  - `sendOrderConfirmationEmail()` - Sends to customer
  - `sendOwnerOrderNotificationEmail()` - Sends to store owner
  - Uses EmailJS for reliable email delivery
  - Requires: `VITE_EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID`
  - Optional owner email: `VITE_OWNER_EMAIL` (defaults to `owner@onestopshop.com`)

### 4. **Complete Checkout Flow** ✅
- **File**: `src/pages/checkout.js` (initCheckoutPage function)
- **Process**:
  1. ✅ Validate all required fields
  2. ✅ Check user authentication (must be logged in)
  3. ✅ Verify live inventory for all items
  4. ✅ Create order in Cloudflare D1
  5. ✅ Reserve inventory immediately
  6. ✅ Store order details in session/localStorage
  7. ✅ Initiate Razorpay payment
  
- **Payment Success Handler**:
  1. ✅ Update order status to "confirmed" and payment_status to "completed"
  2. ✅ Store Razorpay payment ID and order ID
  3. ✅ Send confirmation email to customer
  4. ✅ Send order notification to owner
  5. ✅ Clear user's cart
  
- **Payment Failure/Dismissal Handler**:
  1. ✅ Release reserved inventory back to stock
  2. ✅ Keep order as "pending" in database

### 5. **Stock Management** ✅
- **Inventory Reserve**: Stock is automatically reduced when order is created
- **Inventory Release**: Stock is returned if payment fails or is dismissed
- **API Endpoints**:
  - `POST /api/inventory/reserve` - Reserve items for an order
  - `POST /api/inventory/release` - Release reserved items
  - `GET /api/inventory?ids=id1,id2` - Check current stock

### 6. **Order Notifications Table** ✅
- **File**: `cloudflare/migrations/0004_add_order_notifications.sql`
- **Table**: `order_notifications`
- **Fields**:
  - `id` - Unique notification ID
  - `order_id` - Associated order ID
  - `user_id` - Owner/admin user ID
  - `notification_type` - Type (e.g., "new_order")
  - `status` - Status (pending, sent, read)
  - `email_sent` - Whether email was sent (0/1)
  - `message` - Notification message
  - `customer_name` - Customer name
  - `customer_email` - Customer email
  - `total_amount` - Order total
  - `items_json` - Order items (JSON)
  - `created_at` - Creation timestamp
  - `sent_at` - Email sent timestamp
  
- **Indexes**: For fast lookups by status and order ID

### 7. **Cloudflare Worker Endpoints** ✅
- **File**: `cloudflare/worker.js`
- **New Endpoints**:
  - `POST /api/order-notifications/create` - Create new notification
  - `GET /api/order-notifications/pending?userId=xxx` - Get pending notifications
  - `PUT /api/order-notifications/{id}/mark-sent` - Mark notification as sent

### 8. **Enhanced Payment Success Page** ✅
- **File**: `src/pages/payment-success.js`
- **Displays**:
  - ✅ Order ID (with monospace font for easy copying)
  - ✅ Payment ID
  - ✅ All items ordered with quantities
  - ✅ Itemized breakdown (subtotal, tax, total)
  - ✅ Delivery address with city, state, postal code
  - ✅ Customer email confirmation
  - ✅ Order date and time
  - ✅ Success confirmation message
  - ✅ Next steps information
  - ✅ Quick links to home, continue shopping, and view orders

## Environment Configuration

### Required Environment Variables

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_placeholder_key  # Use placeholder or real key
VITE_RAZORPAY_KEY_SECRET=your_key_secret       # Optional for backend

# EmailJS Configuration
VITE_EMAILJS_ENABLED=true
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID=your_template_id

# Owner Configuration
VITE_OWNER_EMAIL=owner@onestopshop.com  # Owner email for notifications
```

### EmailJS Setup Steps

1. Go to [EmailJS](https://www.emailjs.com/)
2. Create a free account
3. Add your email service (Gmail, Outlook, etc.)
4. Get your Public Key
5. Create email templates:
   - Create template with variables: `to_email`, `order_id`, `order_amount`, `order_items`, `shipping_address`
   - Get the Template ID
6. Update `.env` with these values

## Database Migrations

Run the new migration to create the notifications table:
```sql
-- In Cloudflare D1
-- File: cloudflare/migrations/0004_add_order_notifications.sql
CREATE TABLE IF NOT EXISTS order_notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'new_order',
  status TEXT NOT NULL DEFAULT 'pending',
  email_sent INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  customer_name TEXT,
  customer_email TEXT,
  total_amount REAL NOT NULL DEFAULT 0,
  items_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

## Dummy vs Real Razorpay

### Development (Dummy Mode)
- Uses placeholder key: `rzp_test_placeholder_key`
- Shows test modal with success/failure/cancel buttons
- No actual payment processing
- Perfect for testing the full flow

### Production (Real Mode)
- Set `VITE_RAZORPAY_KEY_ID` to actual Razorpay key
- Loads real Razorpay checkout script
- Processes real payments
- Requires Razorpay merchant account

## Order Flow Sequence Diagram

```
User Checkout
    ↓
Fill Form + Select Payment
    ↓
Click "Proceed to Payment"
    ↓
Validate Form & Login
    ↓
Check Inventory
    ↓
Create Order in DB
    ↓
Reserve Inventory
    ↓
Open Razorpay Checkout
    ↓
┌─────────────────────────┐
│ User Completes Payment  │
└─────────────────────────┘
    ↓
Update Order Status ← Store Razorpay ID
    ↓
Send Customer Email
    ↓
Send Owner Notification
    ↓
Clear Cart
    ↓
Redirect to Success Page
    ↓
Show Order Details & Confirmation
```

## API Endpoints Reference

### Orders
- `GET /api/orders?userId=xxx` - Get user's orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/{orderId}` - Update order details

### Inventory
- `GET /api/inventory?ids=id1,id2` - Get stock levels
- `POST /api/inventory/reserve` - Reserve items
- `POST /api/inventory/release` - Release items

### Notifications
- `POST /api/order-notifications/create` - Create notification
- `GET /api/order-notifications/pending?userId=xxx` - Get pending notifications
- `PUT /api/order-notifications/{id}/mark-sent` - Mark as sent

## Data Structure: Current Order

Order details stored in localStorage and sessionStorage:
```javascript
{
  orderId: "order_1234567890",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "+91 9876543210",
  amount: 5499.99,
  items: [
    {
      id: "prod_1",
      name: "Product Name",
      price: 1999.99,
      quantity: 2
    }
  ],
  shippingAddress: {
    name: "John Doe",
    email: "john@example.com",
    phone: "+91 9876543210",
    address: "123 Main Street",
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "400001"
  },
  paymentId: "pay_XXX",
  status: "success"
}
```

## Stock Reduction Example

```javascript
// When order is created and inventory is reserved:
// Before: Product A has 50 units
// Order: Customer buys 2 units
// After: Product A has 48 units

// If payment fails:
// Inventory is released back: Product A has 50 units again
```

## Email Template Variables

### For Customer
- `to_email` - Customer email
- `to_name` - Customer name
- `order_id` - Order ID
- `order_amount` - Total amount
- `order_items` - List of items
- `shipping_address` - Delivery address
- `app_name` - "onestopshop"

### For Owner
- `to_email` - Owner email
- `order_id` - Order ID
- `customer_name` - Customer name
- `customer_email` - Customer email
- `order_amount` - Total amount
- `order_items` - List of items
- `shipping_address` - Delivery address

## Testing Checklist

### Before Going Live
- [ ] Set up EmailJS account and templates
- [ ] Configure environment variables
- [ ] Test dummy payment flow end-to-end
- [ ] Verify email delivery (customer + owner)
- [ ] Check inventory reservation and release
- [ ] Verify order creation in database
- [ ] Test with real Razorpay test keys
- [ ] Confirm success page displays correctly
- [ ] Test payment failure scenario
- [ ] Test cart clearing after payment
- [ ] Verify order details in user profile

### Development Testing
```bash
# Use dummy key (already set as placeholder)
VITE_RAZORPAY_KEY_ID=rzp_test_placeholder_key

# Test order flow
1. Add items to cart
2. Go to checkout
3. Fill all fields including State
4. Click "Proceed to Payment"
5. Choose "Pay Test Success" in dummy modal
6. Verify emails sent
7. Check order in database
8. Verify inventory updated
```

## Troubleshooting

### Payment Modal Not Opening
- Check if `VITE_RAZORPAY_KEY_ID` is set correctly
- Ensure Razorpay script loads (check console)
- For dummy mode, the modal should always appear

### Emails Not Sending
- Verify EmailJS credentials in environment
- Check EmailJS service is active
- Verify email template ID matches
- Check spam folder for emails
- Enable EmailJS in `.env`: `VITE_EMAILJS_ENABLED=true`

### Inventory Not Updating
- Verify inventory table exists in D1
- Check reservation endpoint is hit
- Look at Cloudflare worker logs
- Ensure product IDs are strings (TEXT in schema)

### Order Not Appearing in Database
- Verify D1 database is configured
- Check orders table exists
- Confirm user is logged in during checkout
- Check Cloudflare worker logs for errors

## Future Enhancements

- [ ] Razorpay webhook for server-side payment verification
- [ ] SMS notifications to customer and owner
- [ ] Push notifications for status updates
- [ ] Order tracking page with real-time status
- [ ] Order cancellation/return flow
- [ ] Refund handling
- [ ] Payment installments
- [ ] Multiple payment methods (Apple Pay, Google Pay)
- [ ] Order history with filters
- [ ] Invoice generation and download

## Security Notes

- All payment details are encrypted in localStorage/sessionStorage
- Razorpay handles PCI compliance
- Database passwords stored in Cloudflare environment
- Email credentials stored securely in EmailJS
- Consider using server-side payment verification for production
- Never store sensitive payment data in client code

## Support & Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [OneStop Project README](./README.md)
