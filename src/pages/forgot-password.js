import { sendPasswordResetEmail } from '../utils/email.js';

export function ForgotPasswordPage() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="margin-bottom: 0.5rem;">Forgot Password</h1>
          <p style="color: var(--text-secondary);">Enter your email and we will send reset instructions.</p>
        </div>

        <form id="forgot-password-form" style="display: grid; gap: 1.2rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Email Address *</label>
            <input
              type="email"
              id="forgot-email"
              placeholder="you@example.com"
              style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit; font-size: 1rem;"
              required
            >
            <span id="forgot-email-error" style="color: #f44336; font-size: 0.8rem; display: none; margin-top: 0.3rem;"></span>
          </div>

          <button type="submit" class="btn" style="width: 100%;">Send Reset Link</button>
          <a href="#/login" class="btn btn-outline" style="width: 100%; text-align: center;">Back to Sign In</a>
        </form>

        <div id="forgot-success" style="display: none; background: #E8F5E9; border-left: 4px solid #43A047; padding: 0.9rem; margin-top: 1rem; border-radius: 4px; color: #2E7D32;"></div>
      </div>
    </div>
  `;
}

export function initForgotPasswordPage() {
  const form = document.getElementById('forgot-password-form');
  if (!form) {
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const emailInput = document.getElementById('forgot-email');
    const errorNode = document.getElementById('forgot-email-error');
    const successNode = document.getElementById('forgot-success');
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = String(emailInput?.value || '').trim().toLowerCase();

    if (errorNode) {
      errorNode.style.display = 'none';
      errorNode.textContent = '';
    }

    if (!email) {
      if (errorNode) {
        errorNode.textContent = 'Email is required';
        errorNode.style.display = 'block';
      }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const result = await sendPasswordResetEmail({ email });

    if (result.success) {
      if (successNode) {
        successNode.style.display = 'block';
        successNode.textContent = 'Reset instructions sent. Check your inbox and spam folder.';
      }
      form.reset();
    } else if (errorNode) {
      errorNode.textContent = result.error || 'Could not send reset email right now.';
      errorNode.style.display = 'block';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';
  });
}
