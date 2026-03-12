export function Navbar() {
  return `
    <div class="announcement-bar">
      FREE SHIPPING ON ORDERS OVER $100 • NEW ARRIVALS JUST LANDED
    </div>
    <header class="main-header">
      <div class="container nav-container">
        <a href="#/" class="logo-link" style="display: flex; align-items: center; gap: 10px;">
          <img src="/logo_updated.png" alt="OneStop Shop 24" class="logo-img">
          <span class="logo-text">ONESTOPSHOP.24</span>
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
          <a href="#/cart" class="icon-link" title="Cart"><i class="fas fa-shopping-bag"></i> (0)</a>
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
