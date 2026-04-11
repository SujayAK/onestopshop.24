import emailjs from '@emailjs/browser';

const EMAILJS_PUBLIC_KEY = String(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '').trim();
const EMAILJS_SERVICE_ID = String(import.meta.env.VITE_EMAILJS_SERVICE_ID || '').trim();
const EMAILJS_WELCOME_TEMPLATE_ID = String(import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID || '').trim();
const EMAILJS_RESET_TEMPLATE_ID = String(import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID || '').trim();
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
