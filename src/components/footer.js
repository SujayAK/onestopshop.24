export function Footer() {
  return `
    <footer class="main-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-column">
            <a href="#/" class="footer-brand" aria-label="OneStopShop home">
              <img src="/25555%20logo.png" alt="OneStopShop" class="footer-logo" width="180" height="63" loading="lazy" decoding="async">
            </a>
            <p class="footer-brand-copy">Your one-stop destination for premium fashion, bags, and accessories.</p>
            <div class="footer-socials">
              <a href="https://www.instagram.com/onestopshop.24" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>
              
            </div>
          </div>
          <div class="footer-column">
            <h4>Shop</h4>
            <ul>
              <li><a href="#/shop">All Products</a></li>
              <li><a href="#/shop?cat=Bags">Bags Collection</a></li>
              <li><a href="#/shop?cat=Accessories">Accessories</a></li>
              <li><a href="#/shop?new=true">New Arrivals</a></li>
            </ul>
          </div>
          <div class="footer-column">
            <h4>Information</h4>
            <ul>
              <li><a href="#/about">About Us</a></li>
              <li><a href="#/contact">Contact Us</a></li>
              <li><a href="#/shipping">Shipping Policy</a></li>
              <li><a href="#/returns">Returns & Exchanges</a></li>
            </ul>
          </div>
          <div class="footer-column">
            <h4>Newsletter</h4>
            <p class="footer-news-copy">Subscribe to get special offers and once-in-a-lifetime deals.</p>
            <form class="footer-news-form">
              <input type="email" placeholder="Your email" class="footer-news-input">
              <button class="btn footer-news-btn">Join</button>
            </form>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 onestopshop. Designed for elegance. Secure and Trusted.</p>
        </div>
      </div>
    </footer>
  `;
}
