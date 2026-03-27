import products from '../data/products.json';

export function HomePage() {
  const featuredProducts = products.slice(0, 3).map(product => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}" class="product-image">
      <p style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">${product.category}</p>
      <h3>${product.name}</h3>
      <p style="font-weight: 700; color: var(--accent-pink);">$${product.price.toFixed(2)}</p>
      <button class="btn btn-outline wishlist-toggle" data-product-id="${product.id}" style="margin-top: 0.75rem; width: 100%;">Add to Wishlist</button>
      <a href="#/product/${product.id}" class="btn btn-outline" style="margin-top: 1rem; width: 100%;">View Details</a>
    </div>
  `).join('');

  return `
    <section class="hero">
      <div class="container hero-content" style="text-align: center;">
        <h1>Your One-Stop Destination for Style</h1>
        <p>Discover curated collections of premium bags and accessories designed for everyday elegance and modern living.</p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <a href="#/shop" class="btn">Shop Collection</a>
          <a href="#/shop?new=true" class="btn btn-outline">New Arrivals</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 style="text-align: center; margin-bottom: 3rem;">Featured Categories</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
          <a href="#/shop?cat=Bags" class="category-card" style="background: url('https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800') center/cover;">
            <div class="category-content">
              <h3 style="color: white; font-size: 2rem;">Bags</h3>
              <span style="text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Explore →</span>
            </div>
          </a>
          <a href="#/shop?cat=Accessories" class="category-card" style="background: url('https://images.unsplash.com/photo-1523206489230-c012c64b2b48?q=80&w=800') center/cover;">
            <div class="category-content">
              <h3 style="color: white; font-size: 2rem;">Accessories</h3>
              <span style="text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Explore →</span>
            </div>
          </a>
        </div>
      </div>
    </section>

    <section class="section" style="background: var(--bg-primary);">
      <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3rem;">
          <div>
            <p style="color: var(--accent-pink); font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.5rem;">Our Favorites</p>
            <h2 style="margin-bottom: 0;">Best Sellers</h2>
          </div>
          <a href="#/shop" style="font-weight: 600; border-bottom: 2px solid var(--accent-pink);">View All Products</a>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem;">
          ${featuredProducts}
        </div>
      </div>
    </section>

    <section class="section" style="background: var(--bg-secondary);">
      <div class="container" style="text-align: center;">
        <p style="color: var(--accent-pink); font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.5rem;">Why Choose Us</p>
        <h2>The OneStop Experience</h2>
        <div class="trust-grid">
          <div class="trust-card">
            <i class="fas fa-gem" style="font-size: 2rem; color: var(--accent-purple); margin-bottom: 1rem;"></i>
            <h4>Curated Quality</h4>
            <p>Each piece in our boutique is handpicked for its quality, durability, and timeless style.</p>
          </div>
          <div class="trust-card">
            <i class="fas fa-shield-alt" style="font-size: 2rem; color: var(--accent-purple); margin-bottom: 1rem;"></i>
            <h4>Secure Shopping</h4>
            <p>Shop with confidence. We use industry-standard encryption to protect your data.</p>
          </div>
          <div class="trust-card">
            <i class="fas fa-camera" style="font-size: 2rem; color: var(--accent-purple); margin-bottom: 1rem;"></i>
            <h4>Real Photography</h4>
            <p>What you see is what you get. We use real product photos to ensure transparency.</p>
          </div>
          <div class="trust-card">
            <i class="fab fa-instagram" style="font-size: 2rem; color: var(--accent-purple); margin-bottom: 1rem;"></i>
            <h4>Community Loved</h4>
            <p>Join thousands of happy customers who trust OneStop for their fashion needs.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="testimonial-section">
      <div class="container">
        <h2 style="text-align: center; margin-bottom: 3rem;">What Our Customers Say</h2>
        <div class="testimonial-container">
          <div class="testimonial-wrapper" id="testimonial-wrapper">
            <div class="testimonial-slide">
              <div class="testimonial-content">"Absolutely love the quality of the bags! The colors are just as vibrant as they look in the photos."</div>
              <div class="testimonial-author">- Sarah J.</div>
            </div>
            <div class="testimonial-slide">
              <div class="testimonial-content">"Fast shipping and the packaging was so cute. Definitely my new favorite shop for accessories."</div>
              <div class="testimonial-author">- Emily R.</div>
            </div>
            <div class="testimonial-slide">
              <div class="testimonial-content">"The attention to detail in every piece is amazing. Highly recommend onestopshop!"</div>
              <div class="testimonial-author">- Michelle L.</div>
            </div>
          </div>
          <div class="testimonial-dots" id="testimonial-dots">
            <span class="dot active" data-index="0"></span>
            <span class="dot" data-index="1"></span>
            <span class="dot" data-index="2"></span>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container" style="text-align: center;">
        <h2>Trusted by our Instagram community</h2>
        <p style="color: var(--text-secondary); margin-bottom: 3rem;">Tag us @onestopshop to be featured</p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
          <div style="aspect-ratio: 1/1; background: #ddd;"></div>
          <div style="aspect-ratio: 1/1; background: #eee;"></div>
          <div style="aspect-ratio: 1/1; background: #ddd;"></div>
          <div style="aspect-ratio: 1/1; background: #eee;"></div>
        </div>
        <a href="https://www.instagram.com/onestopshop" target="_blank" class="btn btn-outline" style="margin-top: 3rem;">Follow Us on Instagram</a>
      </div>
    </section>
  `;
}
