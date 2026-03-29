# pyright: reportMissingImports=false
# Backend Payment Verification - Example with Python/Flask
# Install dependencies: pip install flask flask-cors python-dotenv requests

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import hmac
import hashlib
import requests
from dotenv import load_dotenv
from datetime import datetime
import logging

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

# Razorpay API base URL
RAZORPAY_API_URL = 'https://api.razorpay.com/v1'


def get_razorpay_auth():
    """Return basic auth tuple for Razorpay API calls"""
    return (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)


@app.route('/api/verify-payment', methods=['POST'])
def verify_payment():
    """
    Verify payment signature from Razorpay
    Expected payload:
    {
        "paymentId": "pay_...",
        "orderId": "ORD-...",
        "signature": "..."
    }
    """
    try:
        data = request.get_json()
        payment_id = data.get('paymentId')
        order_id = data.get('orderId')
        signature = data.get('signature')

        if not all([payment_id, order_id, signature]):
            return jsonify({
                'status': 'error',
                'message': 'Missing required payment details'
            }), 400

        # Generate expected signature
        body = f'{order_id}|{payment_id}'
        expected_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            body.encode(),
            hashlib.sha256
        ).hexdigest()

        # Verify signature
        if hmac.compare_digest(expected_signature, signature):
            logger.info(f'Payment verified: {payment_id}')
            # Save order to database here
            return jsonify({
                'status': 'verified',
                'message': 'Payment verified successfully',
                'paymentId': payment_id,
                'orderId': order_id,
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            logger.warning(f'Invalid signature for payment: {payment_id}')
            return jsonify({
                'status': 'failed',
                'message': 'Invalid payment signature'
            }), 400

    except Exception as e:
        logger.error(f'Payment verification error: {str(e)}')
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/create-order', methods=['POST'])
def create_order():
    """
    Create an order with Razorpay
    Expected payload:
    {
        "amount": 100.00,
        "currency": "INR",
        "orderId": "ORD-12345"
    }
    """
    try:
        data = request.get_json()
        amount = data.get('amount')
        currency = data.get('currency', 'INR')
        order_id = data.get('orderId')

        if not amount or amount <= 0:
            return jsonify({
                'status': 'error',
                'message': 'Invalid amount'
            }), 400

        # Create order with Razorpay
        response = requests.post(
            f'{RAZORPAY_API_URL}/orders',
            auth=get_razorpay_auth(),
            json={
                'amount': int(amount * 100),  # Convert to paise
                'currency': currency,
                'receipt': order_id
            }
        )

        if response.status_code == 200:
            order_data = response.json()
            logger.info(f'Order created: {order_data["id"]}')
            return jsonify({
                'status': 'success',
                'orderId': order_data['id'],
                'amount': order_data['amount'],
                'currency': order_data['currency']
            }), 200
        else:
            logger.error(f'Razorpay error: {response.text}')
            return jsonify({
                'status': 'error',
                'message': 'Failed to create order'
            }), 500

    except Exception as e:
        logger.error(f'Order creation error: {str(e)}')
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/capture-payment', methods=['POST'])
def capture_payment():
    """
    Capture a payment
    Expected payload:
    {
        "paymentId": "pay_...",
        "amount": 100.00
    }
    """
    try:
        data = request.get_json()
        payment_id = data.get('paymentId')
        amount = data.get('amount')

        if not payment_id or not amount:
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400

        # Capture payment with Razorpay
        response = requests.post(
            f'{RAZORPAY_API_URL}/payments/{payment_id}/capture',
            auth=get_razorpay_auth(),
            json={
                'amount': int(amount * 100)  # Convert to paise
            }
        )

        if response.status_code == 200:
            payment_data = response.json()
            logger.info(f'Payment captured: {payment_id}')
            return jsonify({
                'status': 'success',
                'message': 'Payment captured successfully',
                'payment': payment_data
            }), 200
        else:
            logger.error(f'Capture error: {response.text}')
            return jsonify({
                'status': 'error',
                'message': 'Failed to capture payment'
            }), 500

    except Exception as e:
        logger.error(f'Payment capture error: {str(e)}')
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/refund-payment', methods=['POST'])
def refund_payment():
    """
    Refund a payment
    Expected payload:
    {
        "paymentId": "pay_...",
        "amount": 100.00  # Optional - full refund if not provided
    }
    """
    try:
        data = request.get_json()
        payment_id = data.get('paymentId')
        amount = data.get('amount')

        if not payment_id:
            return jsonify({
                'status': 'error',
                'message': 'Payment ID is required'
            }), 400

        # Prepare refund data
        refund_data = {}
        if amount:
            refund_data['amount'] = int(amount * 100)  # Convert to paise

        # Refund payment with Razorpay
        response = requests.post(
            f'{RAZORPAY_API_URL}/payments/{payment_id}/refund',
            auth=get_razorpay_auth(),
            json=refund_data
        )

        if response.status_code == 200:
            refund_data = response.json()
            logger.info(f'Refund processed: {refund_data["id"]}')
            return jsonify({
                'status': 'success',
                'message': 'Refund processed successfully',
                'refund': refund_data
            }), 200
        else:
            logger.error(f'Refund error: {response.text}')
            return jsonify({
                'status': 'error',
                'message': 'Failed to process refund'
            }), 500

    except Exception as e:
        logger.error(f'Refund error: {str(e)}')
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/payment/<payment_id>', methods=['GET'])
def get_payment(payment_id):
    """
    Fetch payment details from Razorpay
    """
    try:
        response = requests.get(
            f'{RAZORPAY_API_URL}/payments/{payment_id}',
            auth=get_razorpay_auth()
        )

        if response.status_code == 200:
            payment_data = response.json()
            logger.info(f'Payment fetched: {payment_id}')
            return jsonify({
                'status': 'success',
                'payment': payment_data
            }), 200
        else:
            logger.error(f'Fetch error: {response.text}')
            return jsonify({
                'status': 'error',
                'message': 'Payment not found'
            }), 404

    except Exception as e:
        logger.error(f'Fetch payment error: {str(e)}')
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'payment-api'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=3000)
