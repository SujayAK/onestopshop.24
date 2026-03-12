import products from '../data/products.json';

export function ShopPage() {
  const productCards = products.map(product => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}" class="product-image">
      <p style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">${product.category}</p>
      <h3>${product.name}</h3>
      <p style="font-weight: 700; color: var(--accent-pink);">$${product.price.toFixed(2)}</p>
      <a href="#/product/${product.id}" class="btn btn-outline" style="margin-top: 1rem; width: 100%;">View Details</a>
    </div>
  `).join('');

  return `
    <div class="container section">
      <div class="breadcrumbs">
        <a href="#/">Home</a> / <span>Shop</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem;">
        <h1 style="margin-bottom: 0;">Our Collection</h1>
        <div style="display: flex; gap: 1rem;">
          <select style="padding: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); font-family: inherit;">
            <option>Sort by: Latest</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
          <button class="btn btn-outline" style="padding: 10px 20px;">Filters</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 3rem;">
        ${productCards}
      </div>
      
      <div style="text-align: center; margin-top: 5rem;">
        <button class="btn btn-outline">Load More Products</button>
      </div>
    </div>
  `;
}
