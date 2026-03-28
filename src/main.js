import './styles/main.css';
import { Navbar } from './components/navbar.js';
import { Footer } from './components/footer.js';
import { HomePage, initHomePage } from './pages/home.js';
import { ShopPage, initShopPage } from './pages/shop.js';
import { ProductPage, initProductPage } from './pages/product.js';
import { CartPage, initCartPage } from './pages/cart.js';
import { CheckoutPage, initCheckoutPage } from './pages/checkout.js';
import { PaymentSuccessPage, initPaymentSuccessPage } from './pages/payment-success.js';
import { PaymentFailedPage, initPaymentFailedPage } from './pages/payment-failed.js';
import { LoginPage, initLoginPage } from './pages/login.js';
import { SignupPage, initSignupPage } from './pages/signup.js';
import { ProfilePage, initProfilePage } from './pages/profile.js';
import products from './data/products.json';
import { getAnnouncementBarMessage, getInventoryByProductIds, subscribeToInventoryUpdates } from './utils/supabase.js';
import { cart } from './utils/cart.js';
import { initBackground3D } from './utils/background-3d.js';

const app = document.getElementById('app');
const DEFAULT_ANNOUNCEMENT_MESSAGE = 'FREE SHIPPING ON ORDERS OVER ₹100 • NEW ARRIVALS JUST LANDED';
let scrollHandlerAttached = false;
let productGuardAttached = false;
let unsubscribeInventorySync = null;
const productCatalogById = new Map();

function normalizeCatalogProduct(product) {
  if (!product) {
    return null;
  }

  const id = Number(product.id);
  if (!Number.isFinite(id)) {
    return null;
  }

  return {
    id,
    name: product.name || 'Product',
    category: product.category || 'General',
    price: Number(product.price || 0),
    image: product.image || product.image_url || 'https://via.placeholder.com/600x600?text=Product',
    description: product.description || ''
  };
}

function registerCatalogProducts(productsList = []) {
  productsList.forEach(item => {
    const normalized = normalizeCatalogProduct(item);
    if (normalized) {
      productCatalogById.set(normalized.id, normalized);
    }
  });
}

registerCatalogProducts(products);

function isAuthenticated() {
  try {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    return Boolean(user && user.id);
  } catch (_error) {
    return false;
  }
}

function closeAuthGateModal() {
  const overlay = document.getElementById('auth-gate-overlay');
  if (overlay) {
    overlay.remove();
  }
  document.body.classList.remove('auth-gate-open');
}

function showAuthGateModal(targetHash = '#/login') {
  closeAuthGateModal();
  document.body.classList.add('auth-gate-open');

  const overlay = document.createElement('div');
  overlay.id = 'auth-gate-overlay';
  overlay.className = 'auth-gate-overlay';
  overlay.innerHTML = `
    <div class="auth-gate-modal" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">
      <button type="button" class="auth-gate-close" aria-label="Close">&times;</button>
      <h2 id="auth-gate-title">Sign In Required</h2>
      <p>Please sign in or create an account to view product details and continue shopping securely.</p>
      <div class="auth-gate-actions">
        <a class="btn" href="#/login">Sign In</a>
        <a class="btn btn-outline" href="#/signup">Create Account</a>
      </div>
      <button type="button" class="auth-gate-continue">Continue Browsing</button>
    </div>
  `;

  overlay.querySelector('.auth-gate-close').addEventListener('click', closeAuthGateModal);
  overlay.querySelector('.auth-gate-continue').addEventListener('click', closeAuthGateModal);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      closeAuthGateModal();
    }
  });

  document.body.appendChild(overlay);
}

function initProductAccessGuard() {
  if (productGuardAttached) {
    return;
  }

  productGuardAttached = true;
}

function getWishlistIds() {
  try {
    const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (_error) {
    return [];
  }
}

function setWishlistIds(ids) {
  localStorage.setItem('wishlist', JSON.stringify(ids));
}

function initWishlistButtons() {
  document.querySelectorAll('.wishlist-toggle').forEach(button => {
    const productId = Number(button.getAttribute('data-product-id'));
    const wished = getWishlistIds().includes(productId);
    button.textContent = wished ? 'In Wishlist' : 'Add to Wishlist';
    button.classList.toggle('is-active', wished);
  });

  document.querySelectorAll('.wishlist-toggle').forEach(button => {
    if (button.dataset.wishlistBound === 'true') {
      return;
    }

    button.addEventListener('click', event => {
      const target = event.currentTarget;
      const productId = Number(target.getAttribute('data-product-id'));
      const wishlist = getWishlistIds();
      const exists = wishlist.includes(productId);

      const next = exists ? wishlist.filter(id => id !== productId) : [...wishlist, productId];
      setWishlistIds(next);

      document.querySelectorAll(`.wishlist-toggle[data-product-id="${productId}"]`).forEach(toggle => {
        toggle.textContent = next.includes(productId) ? 'In Wishlist' : 'Add to Wishlist';
        toggle.classList.toggle('is-active', next.includes(productId));
      });
    });

    button.dataset.wishlistBound = 'true';
  });
}

function initAddToCartButtons() {
  document.querySelectorAll('.add-to-cart-btn').forEach(button => {
    if (button.dataset.cartBound === 'true') {
      return;
    }

    button.addEventListener('click', event => {
      const target = event.currentTarget;
      if (target.disabled || target.dataset.stockBlocked === 'true') {
        return;
      }
      const productId = Number(target.getAttribute('data-product-id'));
      const product = productCatalogById.get(productId);

      if (!product) {
        return;
      }

      cart.addItem(product, 1);
      target.textContent = 'Added';
      setTimeout(() => {
        target.textContent = 'Add to Cart';
      }, 900);
    });

    button.dataset.cartBound = 'true';
  });
}

function getStockPresentation(stock) {
  if (!Number.isFinite(stock)) {
    return { label: 'In stock', cssClass: '' };
  }

  if (stock <= 0) {
    return { label: 'Out of stock', cssClass: 'stock-out' };
  }

  if (stock <= 3) {
    return { label: `Only ${stock} left`, cssClass: 'stock-low' };
  }

  return { label: 'In stock', cssClass: '' };
}

function applyInventoryToProductUI(productId, stockValue) {
  const productIdNum = Number(productId);
  const stock = Number(stockValue);
  const safeStock = Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : null;
  const presentation = getStockPresentation(safeStock);

  document
    .querySelectorAll(`[data-stock-label][data-product-id="${productIdNum}"]`)
    .forEach(label => {
      label.textContent = presentation.label;
      label.classList.remove('stock-low', 'stock-out');
      if (presentation.cssClass) {
        label.classList.add(presentation.cssClass);
      }
    });

  document
    .querySelectorAll(`.add-to-cart-btn[data-product-id="${productIdNum}"], #add-to-cart-btn[data-product-id="${productIdNum}"]`)
    .forEach(button => {
      if (safeStock === 0) {
        button.disabled = true;
        button.dataset.stockBlocked = 'true';
        button.textContent = 'Out of Stock';
        return;
      }

      button.disabled = false;
      button.dataset.stockBlocked = 'false';
      const defaultLabel = button.dataset.defaultLabel || 'Add to Cart';
      if (button.textContent === 'Out of Stock') {
        button.textContent = defaultLabel;
      }
    });

  const qtyInput = document.getElementById('product-qty');
  const qtyButton = document.getElementById('add-to-cart-btn');
  if (qtyInput && qtyButton && Number(qtyButton.dataset.productId) === productIdNum && Number.isFinite(safeStock)) {
    qtyInput.max = safeStock > 0 ? String(safeStock) : '1';
    const current = Number(qtyInput.value);
    if (safeStock === 0) {
      qtyInput.value = '1';
      qtyInput.disabled = true;
    } else {
      qtyInput.disabled = false;
      if (!Number.isFinite(current) || current < 1) {
        qtyInput.value = '1';
      } else if (current > safeStock) {
        qtyInput.value = String(safeStock);
      }
    }
  }
}

function getVisibleInventoryProductIds() {
  const ids = new Set();
  document
    .querySelectorAll('.add-to-cart-btn[data-product-id], #add-to-cart-btn[data-product-id], [data-stock-label][data-product-id]')
    .forEach(element => {
      const id = Number(element.getAttribute('data-product-id'));
      if (Number.isFinite(id)) {
        ids.add(id);
      }
    });
  return [...ids];
}

async function initLiveInventorySync() {
  if (typeof unsubscribeInventorySync === 'function') {
    unsubscribeInventorySync();
    unsubscribeInventorySync = null;
  }

  const visibleIds = getVisibleInventoryProductIds();
  if (visibleIds.length === 0) {
    return;
  }

  const inventoryResult = await getInventoryByProductIds(visibleIds);
  if (inventoryResult.success) {
    const foundIds = new Set();
    (inventoryResult.data || []).forEach(row => {
      foundIds.add(Number(row.id));
      applyInventoryToProductUI(row.id, row.stock);
    });

    visibleIds
      .filter(id => !foundIds.has(id))
      .forEach(id => applyInventoryToProductUI(id, null));
  }

  unsubscribeInventorySync = subscribeToInventoryUpdates(updatedProduct => {
    const updatedId = Number(updatedProduct?.id);
    if (!Number.isFinite(updatedId) || !visibleIds.includes(updatedId)) {
      return;
    }
    applyInventoryToProductUI(updatedId, updatedProduct.stock);
  });
}

function initMotionSystem() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    return;
  }

  const revealTargets = document.querySelectorAll(
    '.hero-content, .hero-image, .category-card, .product-card, .trust-card, .testimonial-card, .auth-card, .section h1, .section h2'
  );

  revealTargets.forEach((element, index) => {
    element.classList.add('reveal');
    if (element.matches('.hero-content, .section h1, .section h2')) {
      element.classList.add('reveal-up');
    } else if (element.matches('.hero-image')) {
      element.classList.add('reveal-right');
    } else {
      element.classList.add('reveal-scale');
    }
    element.style.transitionDelay = `${Math.min(index * 30, 240)}ms`;
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
  );

  revealTargets.forEach(target => observer.observe(target));

  const header = document.querySelector('.main-header');
  const updateHeaderState = () => {
    if (!header) {
      return;
    }
    if (window.scrollY > 24) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };

  updateHeaderState();
  if (!scrollHandlerAttached) {
    window.addEventListener('scroll', updateHeaderState, { passive: true });
    scrollHandlerAttached = true;
  }
}

function renderPage(content) {
  const header = Navbar();
  const footer = Footer();
  const whatsappNumber = '1234567890';
  const whatsappMessage = encodeURIComponent('Hi onestopshop, I need help with my order.');
  
  // Create container if not exists or clear it
  app.innerHTML = `
    <div class="animated-bg">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
      <div class="floating-shape shape-4"></div>
      <div class="floating-shape shape-5"></div>
    </div>
    <div class="sticker-layer" aria-hidden="true">
      <div class="sticker sticker-star"><i class="fas fa-star"></i></div>
      <div class="sticker sticker-heart"><i class="fas fa-heart"></i></div>
      <div class="sticker sticker-spark"><i class="fas fa-magic"></i></div>
      <div class="sticker sticker-bolt"><i class="fas fa-bolt"></i></div>
    </div>
    ${header}
    <main id="main-content" class="fade-in">
      ${content}
    </main>
    ${footer}
    <a
      href="https://wa.me/${whatsappNumber}?text=${whatsappMessage}"
      class="whatsapp-floater"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
    >
      <i class="fab fa-whatsapp"></i>
    </a>
  `;
  
  // Scroll to top on every navigation
  window.scrollTo(0, 0);

  // Initialize components after render
  initNavbar();
  initTestimonialSlider();
  initMotionSystem();
  initWishlistButtons();
  initAddToCartButtons();
  initLiveInventorySync();

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
  initAnnouncementBar();
}

async function initAnnouncementBar() {
  const announcementBar = document.getElementById('announcement-bar');
  const announcementText = document.getElementById('announcement-text');
  const closeButton = document.getElementById('close-announcement');

  if (!announcementText || !announcementBar) {
    return;
  }

  // Set default message
  announcementText.textContent = DEFAULT_ANNOUNCEMENT_MESSAGE;

  // Fetch from Supabase
  const result = await getAnnouncementBarMessage();
  if (result.success && result.data) {
    announcementText.textContent = result.data;
  }

  // Add close button functionality
  if (closeButton) {
    closeButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      announcementBar.classList.add('hidden');
      // Store dismissal state in sessionStorage (expires on page refresh)
      sessionStorage.setItem('announcement_dismissed', 'true');
    });

    // Check if announcement was dismissed in this session
    if (sessionStorage.getItem('announcement_dismissed') === 'true') {
      announcementBar.classList.add('hidden');
    }
  }
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
    initHomePage();
  } else if (hash.startsWith('#/profile')) {
    if (!isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }
    const requestedTab = hash.includes('?tab=') ? hash.split('?tab=').pop() : 'overview';
    renderPage(ProfilePage(requestedTab));
    initProfilePage(requestedTab);
  } else if (hash === '#/login') {
    renderPage(LoginPage());
    initLoginPage();
  } else if (hash === '#/signup') {
    renderPage(SignupPage());
    initSignupPage();
  } else if (hash.startsWith('#/shop')) {
    renderPage(ShopPage());
    initShopPage();
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
    initPaymentFailedPage();
  } else if (hash === '#/about') {
    renderPage(`
      <div class="container section">
        <h1 style="text-align: center; margin-bottom: 3rem;">About OneStop</h1>
        <div style="max-width: 800px; margin: 0 auto; line-height: 2;">
          <p style="margin-bottom: 2rem;">Welcome to <strong>onestopshop</strong>, your curated destination for the finest fashion, bags, and accessories. We believe that style should be effortless, elegant, and accessible.</p>
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
              @onestopshop
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
  } else if (hash === '#/wishlist') {
    window.location.hash = '#/profile?tab=wishlist';
    return;
  } else if (hash === '#/search') {
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

window.addEventListener('catalogHydrated', event => {
  registerCatalogProducts(event.detail?.products || []);
  initWishlistButtons();
  initAddToCartButtons();
  initLiveInventorySync();
});

initProductAccessGuard();
initBackground3D({ intensity: 'medium' });
window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
