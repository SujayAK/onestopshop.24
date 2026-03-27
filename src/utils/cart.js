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

  addItem(product, quantity = 1) {
    const existingItem = this.items.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.push({
        ...product,
        quantity
      });
    }
    this.save();
  }

  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.save();
  }

  updateQuantity(productId, quantity) {
    const item = this.items.find(item => item.id === productId);
    if (item) {
      if (quantity <= 0) {
        this.removeItem(productId);
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
