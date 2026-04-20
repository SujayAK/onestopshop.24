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
          <img src="/25555%20logo.png" alt="OneStopShop" class="logo-img" width="180" height="63" decoding="async" fetchpriority="high" loading="eager">
        </a>

        <nav class="nav-center" aria-label="Primary navigation">
          <ul class="nav-links nav-links-desktop" id="nav-links">
            <li class="nav-mega-item" data-nav-section="home">
              <a href="#/" class="nav-mega-link">HOME</a>
            </li>
            <li class="nav-mega-item" data-nav-section="bags">
              <a href="#/shop?cat=Bags" class="nav-mega-link" data-nav-trigger="bags">BAGS</a>
              <div class="nav-list-dropdown" data-nav-dropdown="bags" aria-label="Bags categories">
                <div class="nav-list-dropdown-inner" data-nav-dropdown-list="bags">
                  <span class="nav-mega-loading">Loading bag categories...</span>
                </div>
              </div>
            </li>
            <li class="nav-mega-item" data-nav-section="accessories">
              <a href="#/shop?cat=Accessories" class="nav-mega-link" data-nav-trigger="accessories">ACCESSORIES</a>
              <div class="nav-list-dropdown" data-nav-dropdown="accessories" aria-label="Accessories categories">
                <div class="nav-list-dropdown-inner" data-nav-dropdown-list="accessories">
                  <span class="nav-mega-loading">Loading accessories...</span>
                </div>
              </div>
            </li>
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
            <img src="/25555%20logo.png" alt="OneStopShop" class="logo-img" width="180" height="63" decoding="async" loading="lazy">
          </a>
          <button class="nav-drawer-close" id="nav-drawer-close" type="button" aria-label="Close navigation">&times;</button>
        </div>

        <div class="nav-drawer-body">
          <a href="#/" class="nav-drawer-link">Home</a>

          <div class="nav-drawer-accordion">
            <button type="button" class="nav-drawer-accordion-trigger" data-nav-accordion="bags" aria-expanded="false">
              <span>BAGS</span>
              <i class="fas fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="nav-drawer-accordion-panel" data-nav-mobile-panel="bags" hidden>
              <div class="nav-drawer-grid" data-nav-drawer-grid="bags">
                <span class="nav-mega-loading">Loading bag categories...</span>
              </div>
            </div>
          </div>

          <div class="nav-drawer-accordion">
            <button type="button" class="nav-drawer-accordion-trigger" data-nav-accordion="accessories" aria-expanded="false">
              <span>ACCESSORIES</span>
              <i class="fas fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="nav-drawer-accordion-panel" data-nav-mobile-panel="accessories" hidden>
              <div class="nav-drawer-grid" data-nav-drawer-grid="accessories">
                <span class="nav-mega-loading">Loading accessories...</span>
              </div>
            </div>
          </div>
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
