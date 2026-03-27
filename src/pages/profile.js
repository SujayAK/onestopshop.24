import products from '../data/products.json'
import { getOrders, signOut } from '../utils/supabase.js'

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem('user') || 'null')
  } catch (_error) {
    return null
  }
}

function getWishlistIds() {
  try {
    const stored = JSON.parse(localStorage.getItem('wishlist') || '[]')
    return Array.isArray(stored) ? stored : []
  } catch (_error) {
    return []
  }
}

function normalizeTab(tab) {
  const allowed = ['overview', 'orders', 'wishlist', 'addresses', 'payments', 'settings']
  return allowed.includes(tab) ? tab : 'overview'
}

function getUserDisplayName(user) {
  const meta = user?.user_metadata || {}
  return (
    meta.display_name ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    user?.email?.split('@')[0] ||
    'Guest User'
  )
}

function renderWishlistCards() {
  const wishlistIds = getWishlistIds()
  const wishedProducts = products.filter(product => wishlistIds.includes(product.id))

  if (wishedProducts.length === 0) {
    return `
      <div class="profile-empty-state">
        <i class="far fa-heart"></i>
        <h3>Your wishlist is empty</h3>
        <p>Save products you love to compare and buy later.</p>
        <a href="#/shop" class="btn">Browse Products</a>
      </div>
    `
  }

  return `
    <div class="profile-product-grid">
      ${wishedProducts
        .map(
          product => `
            <article class="profile-product-card">
              <img src="${product.image}" alt="${product.name}">
              <div class="profile-product-info">
                <p class="profile-product-category">${product.category}</p>
                <h4>${product.name}</h4>
                <p class="profile-product-price">₹${product.price.toFixed(2)}</p>
                <div class="profile-product-actions">
                  <a href="#/product/${product.id}" class="btn btn-outline">View</a>
                  <button class="btn-remove-wishlist" data-product-id="${product.id}">Remove</button>
                </div>
              </div>
            </article>
          `
        )
        .join('')}
    </div>
  `
}

export function ProfilePage(tab = 'overview') {
  const activeTab = normalizeTab(tab)
  const user = getStoredUser()

  if (!user) {
    return `
      <div class="container section profile-requires-auth">
        <i class="fas fa-user-lock"></i>
        <h1>Please Sign In</h1>
        <p>Sign in to access your profile, orders, wishlist, and account settings.</p>
        <a href="#/login" class="btn">Sign In</a>
      </div>
    `
  }

  const displayName = getUserDisplayName(user)
  const wishlistCount = getWishlistIds().length

  return `
    <section class="container section profile-page">
      <div class="profile-header">
        <div>
          <p class="profile-kicker">My Account</p>
          <h1>${displayName}</h1>
          <p class="profile-subtitle">${user.email || 'No email available'}</p>
        </div>
        <div class="profile-quick-stats">
          <div class="profile-stat">
            <span id="profile-orders-count">0</span>
            <small>Orders</small>
          </div>
          <div class="profile-stat">
            <span>${wishlistCount}</span>
            <small>Wishlist</small>
          </div>
          <div class="profile-stat">
            <span>Gold</span>
            <small>Loyalty</small>
          </div>
        </div>
      </div>

      <div class="profile-layout">
        <aside class="profile-sidebar">
          <button class="profile-tab-btn ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview"><i class="fas fa-chart-line"></i> Overview</button>
          <button class="profile-tab-btn ${activeTab === 'orders' ? 'active' : ''}" data-tab="orders"><i class="fas fa-box"></i> Purchased Products</button>
          <button class="profile-tab-btn ${activeTab === 'wishlist' ? 'active' : ''}" data-tab="wishlist"><i class="far fa-heart"></i> Wishlist</button>
          <button class="profile-tab-btn ${activeTab === 'addresses' ? 'active' : ''}" data-tab="addresses"><i class="fas fa-map-marker-alt"></i> Addresses</button>
          <button class="profile-tab-btn ${activeTab === 'payments' ? 'active' : ''}" data-tab="payments"><i class="far fa-credit-card"></i> Payment Methods</button>
          <button class="profile-tab-btn ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings"><i class="fas fa-cog"></i> Account Settings</button>
          <button class="profile-signout-btn" id="profile-signout-btn"><i class="fas fa-sign-out-alt"></i> Sign Out</button>
        </aside>

        <div class="profile-content">
          <section class="profile-tab ${activeTab === 'overview' ? 'active' : ''}" data-tab-content="overview">
            <div class="profile-panel-grid">
              <article class="profile-panel">
                <h3><i class="fas fa-box-open"></i> Order Tracking</h3>
                <p>Track active shipments, view invoice history, and reorder in one click.</p>
                <a href="#/profile?tab=orders">View Purchases</a>
              </article>
              <article class="profile-panel">
                <h3><i class="far fa-heart"></i> Saved Wishlist</h3>
                <p>Keep your favorite products saved and get notified on restocks and offers.</p>
                <a href="#/profile?tab=wishlist">Manage Wishlist</a>
              </article>
              <article class="profile-panel">
                <h3><i class="fas fa-map-marked-alt"></i> Delivery Addresses</h3>
                <p>Save multiple delivery addresses for faster checkout like top ecommerce stores.</p>
                <a href="#/profile?tab=addresses">Edit Addresses</a>
              </article>
              <article class="profile-panel">
                <h3><i class="fas fa-shield-alt"></i> Secure Payments</h3>
                <p>Manage saved cards, UPI preferences, and billing details safely.</p>
                <a href="#/profile?tab=payments">Payment Settings</a>
              </article>
            </div>

            <div class="profile-section-block">
              <h3>Recently Purchased Products</h3>
              <div id="profile-overview-purchases" class="profile-loading">Loading your purchases...</div>
            </div>
          </section>

          <section class="profile-tab ${activeTab === 'orders' ? 'active' : ''}" data-tab-content="orders">
            <h2>Purchased Products</h2>
            <p class="profile-muted">Everything you bought appears here with quantity and order status.</p>
            <div id="profile-orders-list" class="profile-loading">Loading your orders...</div>
          </section>

          <section class="profile-tab ${activeTab === 'wishlist' ? 'active' : ''}" data-tab-content="wishlist">
            <h2>Your Wishlist</h2>
            <p class="profile-muted">Save items for later and move them to cart when ready.</p>
            <div id="profile-wishlist-list">${renderWishlistCards()}</div>
          </section>

          <section class="profile-tab ${activeTab === 'addresses' ? 'active' : ''}" data-tab-content="addresses">
            <h2>Saved Addresses</h2>
            <div class="profile-panel-grid">
              <article class="profile-panel">
                <h3>Home</h3>
                <p>Add your default delivery address for one-tap checkout.</p>
                <button class="btn btn-outline">Add Address</button>
              </article>
              <article class="profile-panel">
                <h3>Work</h3>
                <p>Store office address for weekday deliveries and gift drops.</p>
                <button class="btn btn-outline">Add Address</button>
              </article>
            </div>
          </section>

          <section class="profile-tab ${activeTab === 'payments' ? 'active' : ''}" data-tab-content="payments">
            <h2>Payment Methods</h2>
            <div class="profile-panel-grid">
              <article class="profile-panel">
                <h3>Saved Cards</h3>
                <p>Keep preferred cards for faster checkout with secure tokenization.</p>
                <button class="btn btn-outline">Add Card</button>
              </article>
              <article class="profile-panel">
                <h3>UPI & Wallets</h3>
                <p>Manage UPI IDs, linked wallets, and auto-pay preferences.</p>
                <button class="btn btn-outline">Add UPI</button>
              </article>
            </div>
          </section>

          <section class="profile-tab ${activeTab === 'settings' ? 'active' : ''}" data-tab-content="settings">
            <h2>Account Settings</h2>
            <div class="profile-settings-list">
              <button><i class="fas fa-user-edit"></i> Update Personal Information</button>
              <button><i class="fas fa-lock"></i> Change Password</button>
              <button><i class="fas fa-bell"></i> Notification Preferences</button>
              <button><i class="fas fa-shield-alt"></i> Privacy Controls</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  `
}

function setActiveTab(tab) {
  document.querySelectorAll('.profile-tab-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tab)
  })

  document.querySelectorAll('.profile-tab').forEach(section => {
    section.classList.toggle('active', section.dataset.tabContent === tab)
  })
}

function formatOrderStatus(status) {
  if (!status) return 'pending'
  return String(status).replace(/_/g, ' ')
}

function renderPurchasedProductsFromOrders(orders) {
  if (!orders.length) {
    return `
      <div class="profile-empty-state">
        <i class="fas fa-box-open"></i>
        <h3>No purchases yet</h3>
        <p>Your purchased products will appear here after checkout.</p>
        <a href="#/shop" class="btn">Start Shopping</a>
      </div>
    `
  }

  const flattened = []
  orders.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : []
    items.forEach(item => {
      const product = products.find(p => p.id === Number(item.id))
      flattened.push({
        id: item.id,
        name: item.name || product?.name || 'Product',
        image: product?.image,
        quantity: item.quantity || 1,
        price: item.price || product?.price || 0,
        status: order.status || 'pending',
        date: order.created_at,
        orderId: order.id
      })
    })
  })

  return `
    <div class="profile-product-grid">
      ${flattened
        .map(
          item => `
            <article class="profile-product-card">
              <img src="${item.image || 'https://via.placeholder.com/600x600?text=Product'}" alt="${item.name}">
              <div class="profile-product-info">
                <p class="profile-product-category">Order #${item.orderId}</p>
                <h4>${item.name}</h4>
                <p class="profile-product-price">₹${Number(item.price).toFixed(2)} × ${item.quantity}</p>
                <p class="profile-order-meta">Status: <span class="profile-order-status">${formatOrderStatus(item.status)}</span></p>
                <p class="profile-order-meta">Purchased: ${new Date(item.date).toLocaleDateString()}</p>
              </div>
            </article>
          `
        )
        .join('')}
    </div>
  `
}

async function hydrateOrders() {
  const user = getStoredUser()
  const ordersContainer = document.getElementById('profile-orders-list')
  const overviewContainer = document.getElementById('profile-overview-purchases')
  const ordersCount = document.getElementById('profile-orders-count')

  if (!user || !ordersContainer || !overviewContainer || !ordersCount) {
    return
  }

  const result = await getOrders(user.id)
  if (!result.success) {
    const errorHtml = `
      <div class="profile-empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Could not load purchases</h3>
        <p>Orders are unavailable right now. Check Supabase configuration and try again.</p>
      </div>
    `
    ordersContainer.innerHTML = errorHtml
    overviewContainer.innerHTML = errorHtml
    ordersCount.textContent = '0'
    return
  }

  const orders = result.data || []
  ordersCount.textContent = String(orders.length)
  const purchasedHtml = renderPurchasedProductsFromOrders(orders)
  ordersContainer.innerHTML = purchasedHtml
  overviewContainer.innerHTML = purchasedHtml
}

function bindWishlistActions() {
  document.querySelectorAll('.btn-remove-wishlist').forEach(button => {
    button.addEventListener('click', event => {
      const productId = Number(event.currentTarget.dataset.productId)
      const next = getWishlistIds().filter(id => id !== productId)
      localStorage.setItem('wishlist', JSON.stringify(next))

      const wishlistList = document.getElementById('profile-wishlist-list')
      if (wishlistList) {
        wishlistList.innerHTML = renderWishlistCards()
      }

      const wishlistCountStat = document.querySelector('.profile-stat:nth-child(2) span')
      if (wishlistCountStat) {
        wishlistCountStat.textContent = String(next.length)
      }

      bindWishlistActions()
    })
  })
}

export function initProfilePage(initialTab = 'overview') {
  const user = getStoredUser()
  if (!user) {
    return
  }

  const currentTab = normalizeTab(initialTab)
  setActiveTab(currentTab)

  document.querySelectorAll('.profile-tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      const selectedTab = normalizeTab(button.dataset.tab)
      setActiveTab(selectedTab)
      window.location.hash = `#/profile?tab=${selectedTab}`
    })
  })

  const signoutButton = document.getElementById('profile-signout-btn')
  if (signoutButton) {
    signoutButton.addEventListener('click', async () => {
      await signOut()
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('accessToken')
      window.location.hash = '#/login'
    })
  }

  bindWishlistActions()
  hydrateOrders()
}
