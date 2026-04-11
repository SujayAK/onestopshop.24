export function SignupPage() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="margin-bottom: 0.5rem;">Create Account</h1>
          <p style="color: var(--text-secondary);">Join onestopshop and start shopping</p>
        </div>

        <form id="signup-form" style="display: grid; gap: 1.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">First Name *</label>
              <input 
                type="text" 
                id="signup-fname" 
                placeholder="John" 
                style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit; font-size: 1rem;" 
                required
              >
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Last Name *</label>
              <input 
                type="text" 
                id="signup-lname" 
                placeholder="Doe" 
                style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit; font-size: 1rem;" 
                required
              >
            </div>
          </div>

          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Email Address *</label>
            <input 
              type="email" 
              id="signup-email" 
              placeholder="you@example.com" 
              style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit; font-size: 1rem;" 
              required
            >
            <span id="email-error" style="color: #f44336; font-size: 0.8rem; display: none; margin-top: 0.3rem;"></span>
          </div>

          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Password *</label>
            <div style="position: relative;">
              <input 
                type="password" 
                id="signup-password" 
                placeholder="••••••••" 
                style="width: 100%; padding: 12px 50px 12px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit; font-size: 1rem;" 
                required
              >
              <button type="button" id="signup-toggle-password" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.82rem; font-weight: 600; color: var(--accent-pink);">Show</button>
            </div>
            <span id="password-error" style="color: #f44336; font-size: 0.8rem; display: none; margin-top: 0.3rem;"></span>
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
              <p style="margin: 0.2rem 0;">✓ At least 8 characters</p>
              <p style="margin: 0.2rem 0;">✓ One uppercase letter</p>
              <p style="margin: 0.2rem 0;">✓ One number</p>
            </div>
          </div>

          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Confirm Password *</label>
            <div style="position: relative;">
              <input 
                type="password" 
                id="signup-confirm-password" 
                placeholder="••••••••" 
                style="width: 100%; padding: 12px 50px 12px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit; font-size: 1rem;" 
                required
              >
              <button type="button" id="signup-toggle-confirm-password" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.82rem; font-weight: 600; color: var(--accent-pink);">Show</button>
            </div>
            <span id="confirm-error" style="color: #f44336; font-size: 0.8rem; display: none; margin-top: 0.3rem;"></span>
          </div>

          <div>
            <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; font-size: 0.9rem;">
              <input type="checkbox" id="terms-agree" style="cursor: pointer; margin-top: 3px;" required>
              <span>I agree to the <a href="#/terms" style="color: var(--accent-pink);">Terms & Conditions</a> and <a href="#/privacy" style="color: var(--accent-pink);">Privacy Policy</a></span>
            </label>
          </div>

          <button type="submit" class="btn" style="width: 100%; margin-top: 1rem;">Create Account</button>
        </form>

        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-color); text-align: center;">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">Already have an account?</p>
          <a href="#/login" class="btn btn-outline" style="width: 100%; text-align: center;">Sign In</a>
        </div>

        <div style="background: #F3E5F5; border-left: 4px solid #9C27B0; padding: 1rem; margin-top: 2rem; border-radius: 4px; font-size: 0.85rem;">
          <p style="margin: 0; color: #6A1B9A;"><strong>Privacy Protected</strong></p>
          <p style="margin: 0.3rem 0; color: #6A1B9A;">Your data is encrypted and secure. We never share your information.</p>
        </div>
      </div>
    </div>
  `;
}

import { signUp, updateUserProfile } from '../utils/cloudflare.js';
import { sendWelcomeEmail } from '../utils/email.js';

export function initSignupPage() {
  const signupPasswordInput = document.getElementById('signup-password');
  const signupConfirmInput = document.getElementById('signup-confirm-password');
  const signupTogglePassword = document.getElementById('signup-toggle-password');
  const signupToggleConfirm = document.getElementById('signup-toggle-confirm-password');

  if (signupPasswordInput && signupTogglePassword) {
    signupTogglePassword.addEventListener('click', () => {
      const reveal = signupPasswordInput.type === 'password';
      signupPasswordInput.type = reveal ? 'text' : 'password';
      signupTogglePassword.textContent = reveal ? 'Hide' : 'Show';
    });
  }

  if (signupConfirmInput && signupToggleConfirm) {
    signupToggleConfirm.addEventListener('click', () => {
      const reveal = signupConfirmInput.type === 'password';
      signupConfirmInput.type = reveal ? 'text' : 'password';
      signupToggleConfirm.textContent = reveal ? 'Hide' : 'Show';
    });
  }

  const form = document.getElementById('signup-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const fname = document.getElementById('signup-fname').value;
      const lname = document.getElementById('signup-lname').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const confirmPassword = document.getElementById('signup-confirm-password').value;
      const termsAgree = document.getElementById('terms-agree').checked;
      const submitBtn = form.querySelector('button[type="submit"]');

      // Clear errors
      document.getElementById('email-error').style.display = 'none';
      document.getElementById('password-error').style.display = 'none';
      document.getElementById('confirm-error').style.display = 'none';

      // Validation
      if (!fname || !lname || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        document.getElementById('confirm-error').textContent = 'Passwords do not match';
        document.getElementById('confirm-error').style.display = 'block';
        return;
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.{8,})/;
      if (!passwordRegex.test(password)) {
        document.getElementById('password-error').textContent = 'Password must be 8+ chars with uppercase & number';
        document.getElementById('password-error').style.display = 'block';
        return;
      }

      if (!termsAgree) {
        alert('Please agree to Terms & Conditions');
        return;
      }

      try {
        // Disable button during submission
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';

        // Cloudflare signup with user metadata
        const result = await signUp(email, password, {
          first_name: fname,
          last_name: lname,
          display_name: `${fname} ${lname}`
        });

        if (!result.success) {
          document.getElementById('email-error').textContent = result.error;
          document.getElementById('email-error').style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
          return;
        }

        const user = result.data?.user;
        const session = result.data?.session;

        if (user) {
          const profileResult = await updateUserProfile(user.id, {
            first_name: fname,
            last_name: lname,
            user_id: user.id,
            created_at: new Date()
          });

          if (!profileResult.success) {
            console.warn('Profile setup skipped:', profileResult.error);
          }

          // Fire-and-forget welcome email; user signup should not fail if email service is unavailable.
          await sendWelcomeEmail({
            email,
            firstName: fname,
            lastName: lname
          });
        }

        if (user && session) {
          sessionStorage.setItem('user', JSON.stringify({
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata
          }));
          window.location.hash = '#/';
          return;
        }

        alert('Account created successfully. Please verify your email, then sign in.');
        window.location.hash = '#/login';
      } catch (error) {
        console.error('Signup error:', error);
        document.getElementById('email-error').textContent = 'An error occurred during signup';
        document.getElementById('email-error').style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }
}
