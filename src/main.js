import './styles/main.css';
import { Navbar } from './components/navbar.js';
import { Footer } from './components/footer.js';
import { HomePage } from './pages/home.js';
import { ShopPage } from './pages/shop.js';
import { ProductPage, initProductPage } from './pages/product.js';
import { CartPage, initCartPage } from './pages/cart.js';
import { CheckoutPage, initCheckoutPage } from './pages/checkout.js';
import { PaymentSuccessPage, initPaymentSuccessPage } from './pages/payment-success.js';
import { PaymentFailedPage } from './pages/payment-failed.js';
import { cart } from './utils/cart.js';

const app = document.getElementById('app');

function renderPage(content) {
  const header = Navbar();
  const footer = Footer();
  
  // Create container if not exists or clear it
  app.innerHTML = `
    ${header}
    <main id="main-content" class="fade-in">
      ${content}
    </main>
    ${footer}
  `;
  
  // Scroll to top on every navigation
  window.scrollTo(0, 0);

  // Initialize components after render
  initNavbar();
  initTestimonialSlider();

  // Listen for cart updates
  window.addEventListener('cartUpdated', updateCartBadge);
}

function initNavbar() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    // Close menu when clicking on a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  // Update cart badge
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.textContent = cart.getItemCount();
  }
}

function initTestimonialSlider() {
  const wrapper = document.getElementById('testimonial-wrapper');
  const dots = document.querySelectorAll('.dot');
  
  if (wrapper && dots.length > 0) {
    let currentIndex = 0;

    const updateSlider = (index) => {
      wrapper.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach(dot => dot.classList.remove('active'));
      dots[index].classList.add('active');
      currentIndex = index;
    };

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.getAttribute('data-index'));
        updateSlider(index);
      });
    });

    // Auto slide
    setInterval(() => {
      let nextIndex = (currentIndex + 1) % dots.length;
      updateSlider(nextIndex);
    }, 5000);
  }
}

function navigate() {
  const hash = window.location.hash || '#/';
  
  if (hash === '#/' || hash === '') {
    renderPage(HomePage());
  } else if (hash.startsWith('#/shop')) {
    renderPage(ShopPage());
  } else if (hash.startsWith('#/product/')) {
    const id = hash.split('/').pop();
    renderPage(ProductPage(id));
    initProductPage(id);
  } else if (hash === '#/cart') {
    renderPage(CartPage());
    initCartPage();
  } else if (hash === '#/checkout') {
    renderPage(CheckoutPage());
    initCheckoutPage();
  } else if (hash === '#/payment-success') {
    renderPage(PaymentSuccessPage());
    initPaymentSuccessPage();
  } else if (hash === '#/payment-failed') {
    renderPage(PaymentFailedPage());
  } else if (hash === '#/about') {
    renderPage(`
      <div class="container section">
        <h1 style="text-align: center; margin-bottom: 3rem;">About OneStop</h1>
        <div style="max-width: 800px; margin: 0 auto; line-height: 2;">
          <p style="margin-bottom: 2rem;">Welcome to <strong>OneStop Shop 24</strong>, your curated destination for the finest fashion, bags, and accessories. We believe that style should be effortless, elegant, and accessible.</p>
          <p style="margin-bottom: 2rem;">Our boutique was born out of a passion for high-quality craftsmanship and timeless design. Every product in our collection is handpicked to ensure it meets our high standards of quality and style.</p>
          <h2 style="margin-top: 3rem;">Our Commitment to You</h2>
          <p style="margin-bottom: 2rem;">We know that shopping online requires trust. That's why we prioritize transparency, real product photography, and secure checkout processes. We want you to shop with the confidence that what you see is exactly what you will receive.</p>
          <p>Join our growing community on Instagram and see why thousands of customers trust OneStop for their everyday elegance.</p>
        </div>
      </div>
    `);
  } else if (hash === '#/contact') {
    renderPage(`
      <div class="container section">
        <h1 style="text-align: center; margin-bottom: 3rem;">Contact Us</h1>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 4rem;">
          <div>
            <h3>Get in Touch</h3>
            <p style="margin-bottom: 2rem;">Have a question about an order or a product? We're here to help.</p>
            <div style="margin-bottom: 1rem;">
              <strong>Email:</strong><br>
              support@onestopshop24.com
            </div>
            <div style="margin-bottom: 1rem;">
              <strong>WhatsApp:</strong><br>
              +1 (234) 567-890
            </div>
            <div style="margin-bottom: 1rem;">
              <strong>Instagram:</strong><br>
              @onestopshop.24
            </div>
          </div>
          <form style="display: grid; gap: 1.5rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.8rem; text-transform: uppercase; font-weight: 600;">Name</label>
              <input type="text" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); font-family: inherit;">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.8rem; text-transform: uppercase; font-weight: 600;">Email</label>
              <input type="email" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); font-family: inherit;">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.8rem; text-transform: uppercase; font-weight: 600;">Message</label>
              <textarea style="width: 100%; padding: 12px; border: 1px solid var(--border-color); font-family: inherit; height: 150px;"></textarea>
            </div>
            <button class="btn" type="button">Send Message</button>
          </form>
        </div>
      </div>
    `);
  } else if (hash === '#/shipping' || hash === '#/returns') {
    renderPage(`
      <div class="container section">
        <h1 style="text-align: center; margin-bottom: 3rem;">Policies</h1>
        <div style="max-width: 800px; margin: 0 auto;">
          <h2 style="margin-bottom: 1.5rem;">Shipping Policy</h2>
          <p style="margin-bottom: 2rem;">We offer worldwide shipping. Orders are processed within 1-3 business days. Delivery times vary by location but typically range from 5-10 business days.</p>
          
          <h2 style="margin-bottom: 1.5rem;">Returns & Exchanges</h2>
          <div style="background: var(--bg-secondary); padding: 2rem; border-left: 4px solid var(--accent-pink); margin-bottom: 2rem;">
             <p style="font-weight: 600; margin-bottom: 1rem;">Please review product details carefully before placing your order.</p>
             <p>Our current policy does not support returns or exchanges unless the item is defective. We provide detailed descriptions and real photos to help you shop with confidence.</p>
          </div>
          <p>If you receive a damaged item, please contact us within 48 hours of delivery with photos of the damage.</p>
        </div>
      </div>
    `);
  } else if (hash === '#/search' || hash === '#/wishlist') {
    const pageName = hash.substring(2).charAt(0).toUpperCase() + hash.substring(3);
    renderPage(`
      <div class="container section" style="text-align: center; min-height: 50vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <i class="fas fa-tools" style="font-size: 4rem; color: var(--accent-pink); margin-bottom: 2rem;"></i>
        <h1>${pageName} Feature Coming Soon</h1>
        <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 2rem;">We are currently working on the ${pageName} experience to make it perfect for you. Stay tuned!</p>
        <a href="#/shop" class="btn">Continue Shopping</a>
      </div>
    `);
  } else {
    renderPage(`<div class="container section" style="text-align:center;"><h1>404 Page Not Found</h1><a href="#/" class="btn">Back Home</a></div>`);
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
