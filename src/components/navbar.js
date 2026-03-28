export function Navbar() {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  const accountHref = user && user.id ? '#/profile' : '#/login';
  const accountTitle = user && user.id ? 'My Profile' : 'Sign In';

  return `
    <div class="announcement-bar" id="announcement-bar">
      <span id="announcement-text">FREE SHIPPING ON ORDERS OVER ₹100 • NEW ARRIVALS JUST LANDED</span>
      <button id="close-announcement" type="button" aria-label="Close announcement" title="Close">&times;</button>
    </div>
    <header class="main-header">
      <div class="container nav-container">
        <a href="#/" class="logo-link" style="display: flex; align-items: center; gap: 10px;">
          <img src="/logo_updated.png" alt="onestopshop" class="logo-img">
          <span class="logo-text">onestopshop</span>
        </a>
        <nav>
          <ul class="nav-links" id="nav-links">
            <li><a href="#/">Home</a></li>
            <li><a href="#/shop">Shop</a></li>
            <li><a href="#/about">About</a></li>
            <li><a href="#/contact">Contact</a></li>
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
          <div class="hamburger" id="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </header>
  `;
}
