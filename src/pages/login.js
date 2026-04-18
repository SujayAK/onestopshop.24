export function LoginPage() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="margin-bottom: 0.5rem;">Welcome Back</h1>
          <p style="color: var(--text-secondary);">Sign in to your onestopshop account</p>
        </div>

        <form id="login-form" style="display: grid; gap: 1.5rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Email Address *</label>
            <input 
              type="email" 
              id="login-email" 
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
                id="login-password" 
                placeholder="••••••••" 
                style="width: 100%; padding: 12px 50px 12px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit; font-size: 1rem;" 
                required
              >
              <button type="button" id="login-toggle-password" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.82rem; font-weight: 600; color: var(--accent-pink);">Show</button>
            </div>
            <span id="password-error" style="color: #f44336; font-size: 0.8rem; display: none; margin-top: 0.3rem;"></span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="remember-me" style="cursor: pointer;">
              <span>Remember me</span>
            </label>
            <a href="#/forgot-password" style="color: var(--accent-pink); font-weight: 600;">Forgot Password?</a>
          </div>

          <button type="submit" class="btn" style="width: 100%; margin-top: 1rem;">Sign In</button>
        </form>

        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-color); text-align: center;">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">Don't have an account?</p>
          <a href="#/signup" class="btn btn-outline" style="width: 100%; text-align: center;">Create Account</a>
        </div>

        <div style="margin-top: 2rem;">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
            <hr style="flex: 1; border: none; border-top: 1px solid var(--border-color);">
            <span style="font-size: 0.85rem; color: var(--text-secondary);">OR</span>
            <hr style="flex: 1; border: none; border-top: 1px solid var(--border-color);">
          </div>
          
          <button type="button" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; background: transparent; cursor: pointer; font-family: inherit; margin-bottom: 1rem; transition: all 0.3s ease;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'">
            <i class="fab fa-google" style="margin-right: 0.5rem;"></i> Continue with Google
          </button>
          
          <button type="button" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; background: transparent; cursor: pointer; font-family: inherit; transition: all 0.3s ease;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'">
            <i class="fab fa-facebook" style="margin-right: 0.5rem; color: #1877F2;"></i> Continue with Facebook
          </button>
        </div>

        <div style="background: #E3F2FD; border-left: 4px solid #2196F3; padding: 1rem; margin-top: 2rem; border-radius: 4px; font-size: 0.85rem;">
          <p style="margin: 0; color: #1565C0;"><strong>Demo Credentials:</strong></p>
          <p style="margin: 0.3rem 0; color: #1565C0;">Email: demo@onestopshop.com</p>
          <p style="margin: 0; color: #1565C0;">Password: Demo@123</p>
        </div>
      </div>
    </div>
  `;
}

import { signIn } from '../utils/cloudflare.js';
import { showInfoPopup } from '../utils/ui-popup.js';

export function initLoginPage() {
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('login-toggle-password');
  if (passwordInput && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const reveal = passwordInput.type === 'password';
      passwordInput.type = reveal ? 'text' : 'password';
      toggleBtn.textContent = reveal ? 'Hide' : 'Show';
    });
  }

  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const rememberMe = document.getElementById('remember-me').checked;
      const submitBtn = form.querySelector('button[type="submit"]');

      // Clear previous errors
      document.getElementById('email-error').style.display = 'none';
      document.getElementById('password-error').style.display = 'none';

      // Validation
      if (!email || !password) {
        showInfoPopup('Please fill in all fields.');
        return;
      }

      try {
        // Disable button during submission
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        // Cloudflare-backed authentication
        const result = await signIn(email, password);

        if (!result.success) {
          document.getElementById('password-error').textContent = result.error;
          document.getElementById('password-error').style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
          return;
        }

        // Store authenticated user info in sessionStorage for route guards/UI.
        const user = result.data?.user;
        if (user) {
          sessionStorage.setItem('user', JSON.stringify({
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata
          }));
          
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('userEmail', email);
          }
        }

        // Redirect to home
        window.location.hash = '#/';
      } catch (error) {
        console.error('Login error:', error);
        document.getElementById('password-error').textContent = 'An unexpected error occurred';
        document.getElementById('password-error').style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }
}
