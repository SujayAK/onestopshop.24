import emailjs from '@emailjs/browser';

const EMAILJS_PUBLIC_KEY = String(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '').trim();
const EMAILJS_SERVICE_ID = String(import.meta.env.VITE_EMAILJS_SERVICE_ID || '').trim();
const EMAILJS_WELCOME_TEMPLATE_ID = String(import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID || '').trim();
const EMAILJS_RESET_TEMPLATE_ID = String(import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID || '').trim();
const EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID = String(import.meta.env.VITE_EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID || '').trim();
const EMAILJS_ENABLED = String(import.meta.env.VITE_EMAILJS_ENABLED || 'false').trim().toLowerCase() === 'true';

let initialized = false;

function canSend(templateId) {
  return EMAILJS_ENABLED && Boolean(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && templateId);
}

function ensureInit() {
  if (initialized) {
    return;
  }
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  initialized = true;
}

export async function sendWelcomeEmail({ email, firstName = '', lastName = '' }) {
  if (!canSend(EMAILJS_WELCOME_TEMPLATE_ID)) {
    return { success: false, error: 'Email service not configured yet' };
  }

  try {
    ensureInit();
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_WELCOME_TEMPLATE_ID, {
      to_email: email,
      to_name: `${firstName} ${lastName}`.trim() || email,
      first_name: firstName,
      last_name: lastName,
      app_name: 'onestopshop'
    });
    return { success: true };
  } catch (_error) {
    return { success: false, error: 'Failed to send welcome email' };
  }
}

export async function sendPasswordResetEmail({ email }) {
  if (!canSend(EMAILJS_RESET_TEMPLATE_ID)) {
    return { success: false, error: 'Email service not configured yet' };
  }

  try {
    ensureInit();
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_RESET_TEMPLATE_ID, {
      to_email: email,
      reset_link: `${window.location.origin}/#/login`,
      app_name: 'onestopshop'
    });
    return { success: true };
  } catch (_error) {
    return { success: false, error: 'Failed to send reset email' };
  }
}

export async function sendOrderConfirmationEmail({ email, firstName = '', lastName = '', orderId = '', amount = 0, items = [], shippingAddress = {} }) {
  if (!canSend(EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID)) {
    console.log('Order confirmation email not configured, but order created successfully');
    return { success: true, message: 'Email service not configured, but order confirmed' };
  }

  try {
    ensureInit();

    const itemsList = Array.isArray(items) ? items
      .map(item => `${item.name} (Qty: ${item.quantity}) - ₹${(item.price * item.quantity).toFixed(2)}`)
      .join('\\n')
      : '';

    const addressText = shippingAddress ? `
${shippingAddress.address || ''}
${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.postal_code || ''}
Phone: ${shippingAddress.phone || ''}
    `.trim() : '';

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID, {
      to_email: email,
      to_name: `${firstName} ${lastName}`.trim() || email,
      order_id: orderId,
      order_amount: `₹${Number(amount || 0).toFixed(2)}`,
      order_items: itemsList,
      shipping_address: addressText,
      app_name: 'onestopshop'
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    return { success: false, error: 'Failed to send confirmation email' };
  }
}

export async function sendOwnerOrderNotificationEmail({ ownerEmail = 'owner@onestopshop.com', orderId = '', customerName = '', customerEmail = '', amount = 0, items = [], shippingAddress = {} }) {
  if (!canSend(EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID)) {
    return { success: true, message: 'Email service not configured' };
  }

  try {
    ensureInit();

    const itemsList = Array.isArray(items) ? items
      .map(item => `${item.name} (Qty: ${item.quantity}) - ₹${(item.price * item.quantity).toFixed(2)}`)
      .join('\\n')
      : '';

    const addressText = shippingAddress ? `
${shippingAddress.address || ''}
${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.postal_code || ''}
Phone: ${shippingAddress.phone || ''}
    `.trim() : '';

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID, {
      to_email: ownerEmail,
      to_name: 'Store Owner',
      order_id: orderId,
      customer_name: customerName,
      customer_email: customerEmail,
      order_amount: `₹${Number(amount || 0).toFixed(2)}`,
      order_items: itemsList,
      shipping_address: addressText,
      app_name: 'onestopshop'
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send owner notification email:', error);
    return { success: false, error: 'Failed to send notification email' };
  }
}
