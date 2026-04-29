export function Navbar() {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  const accountHref = user && user.id ? '#/profile' : '#/login';
  const accountTitle = user && user.id ? 'My Profile' : 'Sign In';

  return `
    <div class="announcement-bar" id="announcement-bar">
      <marquee id="announcement-text" behavior="scroll" direction="left" scrollamount="6">FREE SHIPPING ON ORDERS OVER ₹100 • NEW ARRIVALS JUST LANDED • CUTE NEW DROPS EVERY WEEK</marquee>
      <button id="close-announcement" type="button" aria-label="Close announcement" title="Close">&times;</button>
    </div>
    <header class="main-header">
      <div class="container nav-container">
        <a href="#/" class="logo-link" style="display: flex; align-items: center; gap: 10px;">
          <img src="/OSS%20logo%20svg.svg" alt="OneStopShop" class="logo-img" width="255" height="55" decoding="async" fetchpriority="high" loading="eager">
        </a>

        <nav class="nav-center" aria-label="Primary navigation">
          <ul class="nav-links nav-links-desktop" id="nav-links">
            <li class="nav-mega-item" data-nav-section="home">
              <a href="#/" class="nav-mega-link">HOME</a>
            </li>
            <!-- Bags and Accessories dropdowns removed as per request -->
          </ul>
        </nav>

        <div class="nav-icons">
          <a href="#/search" class="icon-link" title="Search"><i class="fas fa-search"></i></a>
          <a href="#/wishlist" class="icon-link" title="Wishlist"><i class="far fa-heart"></i></a>
          <a href="${accountHref}" class="icon-link" title="${accountTitle}"><i class="fas fa-user"></i></a>
          <a href="#/cart" class="icon-link cart-link" title="Cart" style="position: relative;">
            <i class="fas fa-shopping-bag"></i>
            <span id="cart-badge" style="position: absolute; top: -8px; right: -8px; background: var(--accent-pink); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">0</span>
          </a>
          <button class="hamburger" id="hamburger" aria-controls="nav-drawer" aria-expanded="false" type="button">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <div class="nav-drawer-overlay" id="nav-drawer-overlay" hidden></div>
      <aside class="nav-drawer" id="nav-drawer" aria-label="Mobile navigation" aria-hidden="true">
        <div class="nav-drawer-header">
          <a href="#/" class="logo-link nav-drawer-logo" style="display: flex; align-items: center; gap: 10px;">
            <img src="/OSS%20logo%20svg.svg" alt="OneStopShop" class="logo-img" width="255" height="55" decoding="async" loading="lazy">
          </a>
          <button class="nav-drawer-close" id="nav-drawer-close" type="button" aria-label="Close navigation">&times;</button>
        </div>

        <div class="nav-drawer-body">
          <a href="#/" class="nav-drawer-link">Home</a>

          <!-- Bags and Accessories accordions removed as per request -->
        </div>

        <div class="nav-drawer-footer">
          <a href="#/search" class="icon-link" title="Search"><i class="fas fa-search"></i></a>
          <a href="#/wishlist" class="icon-link" title="Wishlist"><i class="far fa-heart"></i></a>
          <a href="${accountHref}" class="icon-link" title="${accountTitle}"><i class="fas fa-user"></i></a>
          <a href="#/cart" class="icon-link cart-link" title="Cart" style="position: relative;">
            <i class="fas fa-shopping-bag"></i>
          </a>
        </div>
      </aside>
    </header>
  `;
}
