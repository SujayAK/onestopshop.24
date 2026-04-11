// Cart Management System
class Cart {
  constructor() {
    this.items = [];

    // Recover gracefully if stored cart JSON is invalid.
    try {
      const storedCart = localStorage.getItem('cart');
      this.items = storedCart ? JSON.parse(storedCart) : [];
      if (!Array.isArray(this.items)) {
        this.items = [];
      }
    } catch (_error) {
      this.items = [];
      localStorage.removeItem('cart');
    }
  }

  normalizeId(value) {
    return String(value ?? '').trim();
  }

  addItem(product, quantity = 1) {
    const productId = this.normalizeId(product.id);
    if (!productId) {
      return;
    }

    const existingItem = this.items.find(item => this.normalizeId(item.id) === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.push({
        ...product,
        id: productId,
        quantity
      });
    }
    this.save();
  }

  removeItem(productId) {
    const normalizedId = this.normalizeId(productId);
    this.items = this.items.filter(item => this.normalizeId(item.id) !== normalizedId);
    this.save();
  }

  updateQuantity(productId, quantity) {
    const normalizedId = this.normalizeId(productId);
    const item = this.items.find(entry => this.normalizeId(entry.id) === normalizedId);
    if (item) {
      if (quantity <= 0) {
        this.removeItem(normalizedId);
      } else {
        item.quantity = quantity;
        this.save();
      }
    }
  }

  getItems() {
    return this.items;
  }

  getTotal() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  getItemCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  clear() {
    this.items = [];
    this.save();
  }

  save() {
    localStorage.setItem('cart', JSON.stringify(this.items));
    // Emit custom event for cart updates
    window.dispatchEvent(new Event('cartUpdated'));
  }
}

export const cart = new Cart();
