export function Footer() {
  return `
    <footer class="main-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-column">
            <h4 class="logo-text">OneStopShop</h4>
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.5rem;">Your one-stop destination for premium fashion, bags & accessories. Curated with care for the modern lifestyle.</p>
            <div style="display: flex; gap: 1rem; font-size: 1.2rem;">
              <a href="https://www.instagram.com/onestopshop" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>
              <a href="#" title="Facebook"><i class="fab fa-facebook"></i></a>
              <a href="#" title="Pinterest"><i class="fab fa-pinterest"></i></a>
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
            <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin-bottom: 1rem;">Subscribe to get special offers and once-in-a-lifetime deals.</p>
            <form style="display: flex; gap: 5px;">
              <input type="email" placeholder="Your email" style="padding: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; flex: 1; font-size: 0.8rem;">
              <button class="btn" style="padding: 10px 15px; font-size: 0.7rem;">Join</button>
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
