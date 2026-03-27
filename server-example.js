// Backend Payment Verification - Example with Node.js/Express
// Install dependencies: npm install express dotenv crypto-js axios

import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

/**
 * Verify payment with Razorpay
 * This should be called from your frontend after successful payment
 */
app.post('/api/verify-payment', (req, res) => {
  try {
    const { paymentId, orderId, signature } = req.body;

    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required payment details'
      });
    }

    // Generate signature
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // Verify signature
    if (expectedSignature === signature) {
      // Payment is verified - save order to database here
      return res.json({
        status: 'verified',
        message: 'Payment verified successfully',
        paymentId: paymentId,
        orderId: orderId
      });
    } else {
      return res.status(400).json({
        status: 'failed',
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Create order with Razorpay
 * This endpoint creates an order which can be used with Razorpay checkout
 */
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid amount'
      });
    }

    // Create order request to Razorpay
    const config = {
      auth: {
        username: RAZORPAY_KEY_ID,
        password: RAZORPAY_KEY_SECRET
      }
    };

    const response = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency,
        receipt: orderId
      },
      config
    );

    return res.json({
      status: 'success',
      orderId: response.data.id,
      amount: response.data.amount,
      currency: response.data.currency
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Capture payment
 * This endpoint is called to capture a held payment
 */
app.post('/api/capture-payment', async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId || !amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    const config = {
      auth: {
        username: RAZORPAY_KEY_ID,
        password: RAZORPAY_KEY_SECRET
      }
    };

    const response = await axios.post(
      `https://api.razorpay.com/v1/payments/${paymentId}/capture`,
      {
        amount: Math.round(amount * 100)
      },
      config
    );

    return res.json({
      status: 'success',
      message: 'Payment captured successfully',
      payment: response.data
    });
  } catch (error) {
    console.error('Payment capture error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Refund payment
 * This endpoint is called to refund a payment
 */
app.post('/api/refund-payment', async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment ID is required'
      });
    }

    const config = {
      auth: {
        username: RAZORPAY_KEY_ID,
        password: RAZORPAY_KEY_SECRET
      }
    };

    const refundData = {
      ...(amount && { amount: Math.round(amount * 100) })
    };

    const response = await axios.post(
      `https://api.razorpay.com/v1/payments/${paymentId}/refund`,
      refundData,
      config
    );

    return res.json({
      status: 'success',
      message: 'Refund processed successfully',
      refund: response.data
    });
  } catch (error) {
    console.error('Refund error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Fetch payment details
 */
app.get('/api/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const config = {
      auth: {
        username: RAZORPAY_KEY_ID,
        password: RAZORPAY_KEY_SECRET
      }
    };

    const response = await axios.get(
      `https://api.razorpay.com/v1/payments/${paymentId}`,
      config
    );

    return res.json({
      status: 'success',
      payment: response.data
    });
  } catch (error) {
    console.error('Fetch payment error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Payment server running on port ${PORT}`);
});

export default app;
