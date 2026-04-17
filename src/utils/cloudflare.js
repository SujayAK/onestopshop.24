function resolveApiBaseUrl() {
  const configuredBaseUrl = String(import.meta.env.VITE_CLOUDFLARE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (configuredBaseUrl) {
    return configuredBaseUrl.endsWith('/api')
      ? configuredBaseUrl.slice(0, -4)
      : configuredBaseUrl;
  }

  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const hostname = String(window.location.hostname || '').toLowerCase();
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocalhost) {
      return window.location.origin;
    }
  }

  return '';
}

const API_BASE_URL = resolveApiBaseUrl();
const IMAGE_BASE_URL = String(import.meta.env.VITE_CLOUDFLARE_IMAGE_BASE_URL || '').trim().replace(/\/$/, '');
const DEV_MODE = String(import.meta.env.VITE_CLOUDFLARE_DEV_MODE || 'true').trim().toLowerCase() !== 'false';
const CACHE_PREFIX = 'onestop.cloudflare.cache.';
const REQUEST_TIMEOUT_MS = 8000;
const REQUEST_RETRY_TIMEOUT_MS = 5000;
const requestCache = new Map();

const STORAGE_KEYS = {
  users: 'onestop.users',
  session: 'onestop.session',
  wishlist: 'wishlist',
  compare: 'compare',
  orders: 'onestop.orders',
  inventory: 'onestop.inventory',
  announcement: 'onestop.announcement',
  coupons: 'onestop.coupons'
};

const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@onestopshop.com',
  password: 'Demo@123',
  user_metadata: {
    first_name: 'Demo',
    last_name: 'User',
    display_name: 'Demo User'
  }
};

function readJsonStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem('user') || 'null');
  } catch (_error) {
    return null;
  }
}

function writeSessionUser(user) {
  if (!user) {
    sessionStorage.removeItem('user');
    return;
  }

  sessionStorage.setItem('user', JSON.stringify(user));
}

function cacheKeyFor(name) {
  return `${CACHE_PREFIX}${name}`;
}

function readCachedPayload(cacheKey, ttlMs) {
  const now = Date.now();
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(cacheKey);
      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && now - Number(parsed.savedAt || 0) <= ttlMs) {
        return parsed.data;
      }
    } catch (_error) {
      // Ignore cache read failures.
    }
  }

  return null;
}

function writeCachedPayload(cacheKey, data, persist = true) {
  const payload = JSON.stringify({ savedAt: Date.now(), data });
  try {
    sessionStorage.setItem(cacheKey, payload);
  } catch (_error) {
    // Ignore session cache write failures.
  }

  if (persist) {
    try {
      localStorage.setItem(cacheKey, payload);
    } catch (_error) {
      // Ignore persistent cache write failures.
    }
  }
}

async function cachedRemoteRequest(cacheKey, ttlMs, fetcher, options = {}) {
  if (!API_BASE_URL) {
    return fetcher();
  }

  if (!options.forceRefresh) {
    const cached = readCachedPayload(cacheKey, ttlMs);
    if (cached) {
      return cached;
    }

    const memoryCached = requestCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.savedAt <= ttlMs) {
      return memoryCached.data;
    }
  }

  const result = await fetcher();
  if (result && result.success) {
    const payload = { savedAt: Date.now(), data: result };
    requestCache.set(cacheKey, payload);
    writeCachedPayload(cacheKey, result, options.persist !== false);
  }

  return result;
}

function getInventoryState() {
  const stored = readJsonStorage(STORAGE_KEYS.inventory, null);
  if (stored && typeof stored === 'object') {
    return stored;
  }
  writeJsonStorage(STORAGE_KEYS.inventory, {});
  return {};
}

function setInventoryState(state) {
  writeJsonStorage(STORAGE_KEYS.inventory, state);
}

function getUsersState() {
  const fallback = [DEMO_USER];
  const users = readJsonStorage(STORAGE_KEYS.users, null);
  if (Array.isArray(users)) {
    return users;
  }
  writeJsonStorage(STORAGE_KEYS.users, fallback);
  return fallback;
}

function setUsersState(users) {
  writeJsonStorage(STORAGE_KEYS.users, users);
}

function getOrdersState() {
  return readJsonStorage(STORAGE_KEYS.orders, []);
}

function setOrdersState(orders) {
  writeJsonStorage(STORAGE_KEYS.orders, orders);
}

function getCouponState() {
  return readJsonStorage(STORAGE_KEYS.coupons, [
    { code: 'WELCOME10', discount: 10, active: true },
    { code: 'CLEARANCE20', discount: 20, active: true }
  ]);
}

function setCouponState(coupons) {
  writeJsonStorage(STORAGE_KEYS.coupons, coupons);
}

function getAnnouncementFallback() {
  return readJsonStorage(STORAGE_KEYS.announcement, 'FREE SHIPPING ON ORDERS OVER ₹999 • NEW ARRIVALS JUST LANDED');
}

function setAnnouncementFallback(message) {
  localStorage.setItem(STORAGE_KEYS.announcement, String(message || ''));
}

function getWishlistState() {
  const value = readJsonStorage(STORAGE_KEYS.wishlist, []);
  return Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean) : [];
}

function setWishlistState(ids) {
  writeJsonStorage(STORAGE_KEYS.wishlist, ids);
}

function getCompareState() {
  const value = readJsonStorage(STORAGE_KEYS.compare, []);
  return Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean) : [];
}

function setCompareState(ids) {
  writeJsonStorage(STORAGE_KEYS.compare, ids);
}

function buildUrl(path) {
  if (!API_BASE_URL) {
    return '';
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const apiPath = normalized.startsWith('/api') ? normalized : `/api${normalized}`;
  return `${API_BASE_URL}${apiPath}`;
}

async function request(path, options = {}) {
  if (!API_BASE_URL) {
    return { success: false, error: 'Cloudflare API base URL is not configured' };
  }

  const url = buildUrl(path);

  const runFetch = async (credentials, timeoutMs) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        credentials,
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  let response;
  try {
    response = await runFetch('include', REQUEST_TIMEOUT_MS);
  } catch (_error) {
    try {
      response = await runFetch('omit', REQUEST_RETRY_TIMEOUT_MS);
    } catch (retryError) {
      if (retryError?.name !== 'AbortError') {
        console.error('Cloudflare API request failed', url, retryError);
      }
      return { success: false, error: 'Failed to reach Cloudflare API', data: null };
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const error = typeof payload === 'string' ? payload : payload?.error || `Request failed with ${response.status}`;
    return { success: false, error, data: null };
  }

  if (payload && typeof payload === 'object' && 'success' in payload) {
    return payload;
  }

  return { success: true, data: payload };
}

function withLocalUser(user) {
  if (!user) {
    return null;
  }

  const normalized = {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {}
  };

  writeSessionUser(normalized);
  return normalized;
}

function localSearchProducts(products, search) {
  if (!search) {
    return products;
  }

  const term = String(search).toLowerCase();
  return products.filter(product => {
    return [product.name, product.description, product.category, product.subcategory]
      .some(value => String(value || '').toLowerCase().includes(term));
  });
}

function sortProducts(products, sort) {
  const items = [...products];
  switch (sort) {
    case 'price-asc':
      return items.sort((left, right) => Number(left.price || 0) - Number(right.price || 0));
    case 'price-desc':
      return items.sort((left, right) => Number(right.price || 0) - Number(left.price || 0));
    case 'name-asc':
      return items.sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
    case 'name-desc':
      return items.sort((left, right) => String(right.name || '').localeCompare(String(left.name || '')));
    default:
      return items.sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
  }
}

function getLocalCatalog() {
  return [];
}

function filterProducts(products, options = {}) {
  const {
    category,
    subcategory,
    taxonomyIds,
    search,
    minPrice,
    maxPrice,
    onlyActive = true,
    clearance = false
  } = options;

  let filtered = [...products];

  if (onlyActive) {
    filtered = filtered.filter(product => product.active !== false);
  }

  if (category) {
    filtered = filtered.filter(product => String(product.category || '').toLowerCase() === String(category).toLowerCase());
  }

  if (subcategory) {
    filtered = filtered.filter(product => String(product.subcategory || '').toLowerCase() === String(subcategory).toLowerCase());
  }

  if (Array.isArray(taxonomyIds) && taxonomyIds.length > 0) {
    const accepted = new Set(taxonomyIds.map(id => String(id).trim()).filter(Boolean));
    filtered = filtered.filter(product => accepted.has(String(product.taxonomy_id || '').trim()));
  }

  filtered = localSearchProducts(filtered, search);

  if (Number.isFinite(Number(minPrice))) {
    filtered = filtered.filter(product => Number(product.price || 0) >= Number(minPrice));
  }

  if (Number.isFinite(Number(maxPrice))) {
    filtered = filtered.filter(product => Number(product.price || 0) <= Number(maxPrice));
  }

  if (clearance) {
    filtered = filtered.filter(product => Number(product.discount || 0) > 0 || String(product.category || '').toLowerCase().includes('clearance'));
  }

  return filtered;
}

async function getRemoteProducts(options = {}) {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','));
      }
    } else if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  return request(`/products${params.toString() ? `?${params.toString()}` : ''}`);
}

export async function signUp(email, password, userData = {}) {
  if (API_BASE_URL) {
    return request('/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify({ email, password, userData })
    });
  }

  const users = getUsersState();
  const exists = users.find(user => String(user.email).toLowerCase() === String(email).toLowerCase());
  if (exists) {
    return { success: false, error: 'This email already exists' };
  }

  const user = {
    id: `user_${Date.now()}`,
    email,
    password,
    user_metadata: { ...userData }
  };

  users.push(user);
  setUsersState(users);
  return { success: true, data: { user: withLocalUser(user), session: { access_token: `local_${user.id}` } } };
}

export async function signIn(email, password) {
  if (API_BASE_URL) {
    return request('/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  const users = getUsersState();
  const user = users.find(entry => String(entry.email).toLowerCase() === String(email).toLowerCase() && String(entry.password) === String(password));

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  const normalized = withLocalUser(user);
  return { success: true, data: { user: normalized, session: { access_token: `local_${user.id}` } } };
}

export async function signOut() {
  if (API_BASE_URL) {
    return request('/auth/sign-out', { method: 'POST' });
  }

  writeSessionUser(null);
  return { success: true };
}

export async function getCurrentUser() {
  if (API_BASE_URL) {
    const result = await request('/auth/me');
    return result.success ? result.data || null : null;
  }

  return readSessionUser();
}

export async function getSession() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return {
    user,
    access_token: `local_${user.id}`
  };
}

export async function updateUserProfile(userId, profileData = {}) {
  if (API_BASE_URL) {
    return request(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  const users = getUsersState();
  const index = users.findIndex(user => String(user.id) === String(userId));
  if (index === -1) {
    return { success: false, error: 'User not found' };
  }

  users[index] = {
    ...users[index],
    user_metadata: {
      ...(users[index].user_metadata || {}),
      ...profileData
    }
  };
  setUsersState(users);
  const sessionUser = readSessionUser();
  if (sessionUser && String(sessionUser.id) === String(userId)) {
    writeSessionUser({ ...sessionUser, user_metadata: users[index].user_metadata });
  }

  return { success: true, data: users[index] };
}

function normalizeOptions(options = {}) {
  return {
    limit: Number.isFinite(Number(options.limit)) ? Number(options.limit) : 20,
    offset: Number.isFinite(Number(options.offset)) ? Number(options.offset) : 0,
    category: options.category,
    subcategory: options.subcategory,
    search: options.search,
    minPrice: options.minPrice,
    maxPrice: options.maxPrice,
    sort: options.sort || 'newest',
    onlyActive: options.onlyActive !== false,
    taxonomyIds: options.taxonomyIds,
    clearance: Boolean(options.clearance)
  };
}

export async function getProducts(limit = 20, offset = 0) {
  return getProductsCatalog({ limit, offset });
}

export async function getProductsCatalog(options = {}) {
  if (API_BASE_URL) {
    const normalized = normalizeOptions(options);
    const remote = await cachedRemoteRequest(cacheKeyFor(`products:${JSON.stringify(normalized)}`), 5 * 60 * 1000, () => getRemoteProducts(normalized));
    if (remote.success) {
      return remote;
    }
  }

  return { success: true, data: [] };
}

export async function getProductsCatalogAdvanced(options = {}) {
  return getProductsCatalog(options);
}

export async function getStockClearanceProducts(options = {}) {
  if (API_BASE_URL) {
    const query = new URLSearchParams(options).toString();
    const remote = await cachedRemoteRequest(cacheKeyFor(`clearance:${query}`), 5 * 60 * 1000, () => request(`/products/clearance${query ? `?${query}` : ''}`));
    if (remote.success) {
      return remote;
    }
  }

  const normalized = normalizeOptions({ ...options, clearance: true });
  let products = filterProducts(getLocalCatalog(), normalized);
  products = sortProducts(products, normalized.sort).slice(normalized.offset, normalized.offset + normalized.limit);
  return { success: true, data: products };
}

export async function getStockClearanceCategories() {
  if (API_BASE_URL) {
    const remote = await cachedRemoteRequest(cacheKeyFor('clearance-categories'), 10 * 60 * 1000, () => request('/products/clearance/categories'));
    if (remote.success) {
      return remote;
    }
  }

  return { success: true, data: [] };
}

export async function getProduct(id) {
  const productId = String(id || '').trim();
  if (!productId) {
    return { success: false, error: 'Invalid product id', data: null };
  }

  if (API_BASE_URL) {
    const remote = await cachedRemoteRequest(cacheKeyFor(`product:${productId}`), 10 * 60 * 1000, () => request(`/products/${encodeURIComponent(productId)}`));
    if (remote.success) {
      return remote;
    }
  }

  return { success: false, error: 'Product not found', data: null };
}

export async function getTaxonomyTree() {
  if (API_BASE_URL) {
    const remote = await cachedRemoteRequest(cacheKeyFor('taxonomy'), 15 * 60 * 1000, () => request('/taxonomy'));
    if (remote.success) {
      return remote;
    }
  }

  return { success: true, data: [] };
}

export async function getInventoryTaxonomy() {
  return getTaxonomyTree();
}

export async function getUserWishlist() {
  if (API_BASE_URL) {
    const user = await getCurrentUser();
    if (user) {
      const remote = await cachedRemoteRequest(cacheKeyFor('wishlist'), 2 * 60 * 1000, () => request('/wishlist'), { persist: false });
      if (remote.success) {
        return remote;
      }
    }
  }

  return { success: true, data: getWishlistState() };
}

export async function getUserCompare() {
  if (API_BASE_URL) {
    const user = await getCurrentUser();
    if (user) {
      const remote = await cachedRemoteRequest(cacheKeyFor('compare'), 2 * 60 * 1000, () => request('/compare'), { persist: false });
      if (remote.success) {
        return remote;
      }
    }
  }

  return { success: true, data: getCompareState() };
}

export async function toggleWishlistProductSync(productId) {
  const id = String(productId).trim();
  if (!id) {
    return { success: false, error: 'Invalid product id', active: false };
  }

  if (API_BASE_URL) {
    const result = await request('/wishlist/toggle', { method: 'POST', body: JSON.stringify({ productId: id }) });
    if (result.success) {
      const current = new Set((readCachedPayload(cacheKeyFor('wishlist'), 2 * 60 * 1000)?.data || []).map(item => String(item).trim()).filter(Boolean));
      if (result.active) {
        current.add(id);
      } else {
        current.delete(id);
      }
      writeCachedPayload(cacheKeyFor('wishlist'), { success: true, data: [...current] }, false);
    }
    return result;
  }

  const next = new Set(getWishlistState());
  const active = next.has(id) ? (next.delete(id), false) : (next.add(id), true);
  setWishlistState([...next]);
  return { success: true, active };
}

export async function toggleCompareProductSync(productId) {
  const id = String(productId).trim();
  if (!id) {
    return { success: false, error: 'Invalid product id', active: false };
  }

  if (API_BASE_URL) {
    const result = await request('/compare/toggle', { method: 'POST', body: JSON.stringify({ productId: id }) });
    if (result.success) {
      const current = new Set((readCachedPayload(cacheKeyFor('compare'), 2 * 60 * 1000)?.data || []).map(item => String(item).trim()).filter(Boolean));
      if (result.active) {
        current.add(id);
      } else {
        current.delete(id);
      }
      writeCachedPayload(cacheKeyFor('compare'), { success: true, data: [...current] }, false);
    }
    return result;
  }

  const next = new Set(getCompareState());
  if (!next.has(id) && next.size >= 4) {
    return { success: false, error: 'Compare limit reached' };
  }

  const active = next.has(id) ? (next.delete(id), false) : (next.add(id), true);
  setCompareState([...next]);
  return { success: true, active };
}

export async function getInventoryByProductIds(productIds = []) {
  const ids = [...new Set((Array.isArray(productIds) ? productIds : []).map(id => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { success: true, data: [] };
  }

  if (API_BASE_URL) {
    const chunkSize = 8;
    const chunks = [];

    for (let index = 0; index < ids.length; index += chunkSize) {
      chunks.push(ids.slice(index, index + chunkSize));
    }

    const responses = await Promise.all(chunks.map(async chunk => {
      const sortedChunk = [...chunk].sort();
      return cachedRemoteRequest(
        cacheKeyFor(`inventory:${sortedChunk.join(',')}`),
        60 * 1000,
        () => request(`/inventory?ids=${chunk.join(',')}`),
        { persist: false }
      );
    }));

    const merged = [];
    let allSucceeded = true;
    responses.forEach(response => {
      if (response && response.success && Array.isArray(response.data)) {
        merged.push(...response.data);
      } else {
        allSucceeded = false;
      }
    });

    if (allSucceeded && merged.length > 0) {
      return { success: true, data: merged };
    }
  }

  const inventory = getInventoryState();
  return {
    success: true,
    data: ids.map(id => ({ id, stock: Number.isFinite(Number(inventory[id])) ? Number(inventory[id]) : 0 }))
  };
}

export async function reserveInventory(items = []) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map(item => ({ id: String(item.id).trim(), quantity: Number(item.quantity || 0) }))
    .filter(item => Boolean(item.id) && item.quantity > 0);

  if (normalizedItems.length === 0) {
    return { success: false, error: 'No inventory items provided' };
  }

  if (API_BASE_URL) {
    return request('/inventory/reserve', { method: 'POST', body: JSON.stringify({ items: normalizedItems }) });
  }

  const inventory = getInventoryState();
  for (const item of normalizedItems) {
    const currentStock = Number.isFinite(Number(inventory[item.id])) ? Number(inventory[item.id]) : 0;
    if (item.quantity > currentStock) {
      return { success: false, error: `Insufficient stock for ${item.id}` };
    }
  }

  normalizedItems.forEach(item => {
    inventory[item.id] = Math.max(0, (Number(inventory[item.id]) || 0) - item.quantity);
  });

  setInventoryState(inventory);
  return { success: true, data: { reserved: true } };
}

export async function releaseInventory(items = []) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map(item => ({ id: String(item.id).trim(), quantity: Number(item.quantity || 0) }))
    .filter(item => Boolean(item.id) && item.quantity > 0);

  if (normalizedItems.length === 0) {
    return { success: true };
  }

  if (API_BASE_URL) {
    return request('/inventory/release', { method: 'POST', body: JSON.stringify({ items: normalizedItems }) });
  }

  const inventory = getInventoryState();
  normalizedItems.forEach(item => {
    inventory[item.id] = Math.max(0, (Number(inventory[item.id]) || 0) + item.quantity);
  });

  setInventoryState(inventory);
  return { success: true };
}

export async function createOrder(userId, items, totalAmount, shippingAddress = {}) {
  const normalizedItems = (Array.isArray(items) ? items : []).map(item => ({
    id: String(item.id),
    name: item.name || 'Product',
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 1)
  }));

  if (API_BASE_URL) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify({ userId, items: normalizedItems, totalAmount, shippingAddress })
    });
  }

  const orders = getOrdersState();
  const order = {
    id: `order_${Date.now()}`,
    user_id: userId,
    items: normalizedItems,
    total_amount: Number(totalAmount || 0),
    shipping_address: shippingAddress,
    status: 'pending',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  orders.unshift(order);
  setOrdersState(orders);
  return { success: true, data: order };
}

export async function getOrders(userId) {
  if (API_BASE_URL) {
    const remote = await cachedRemoteRequest(cacheKeyFor(`orders:${String(userId)}`), 45 * 1000, () => request(`/orders?userId=${encodeURIComponent(String(userId))}`), { persist: false });
    if (remote.success) {
      return remote;
    }
  }

  const orders = getOrdersState().filter(order => String(order.user_id) === String(userId));
  return { success: true, data: orders };
}

export async function updateOrder(orderId, updates = {}) {
  if (API_BASE_URL) {
    return request(`/orders/${encodeURIComponent(String(orderId))}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  const orders = getOrdersState();
  const index = orders.findIndex(order => String(order.id) === String(orderId));
  if (index === -1) {
    return { success: false, error: 'Order not found' };
  }

  orders[index] = { ...orders[index], ...updates, updated_at: new Date().toISOString() };
  setOrdersState(orders);
  return { success: true, data: orders[index] };
}

export async function validateCoupon(code, amount) {
  if (API_BASE_URL) {
    return request('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, amount })
    });
  }

  const coupon = getCouponState().find(item => String(item.code).toLowerCase() === String(code).toLowerCase() && item.active !== false);
  if (!coupon) {
    return { success: false, error: 'Invalid coupon code' };
  }

  const discountAmount = Math.min(Number(amount || 0), (Number(amount || 0) * Number(coupon.discount || 0)) / 100);
  return { success: true, data: { code: coupon.code, discount: coupon.discount, discountAmount } };
}

export async function redeemCoupon(code, userId) {
  if (API_BASE_URL) {
    return request('/coupons/redeem', {
      method: 'POST',
      body: JSON.stringify({ code, userId })
    });
  }

  const coupons = getCouponState();
  const index = coupons.findIndex(item => String(item.code).toLowerCase() === String(code).toLowerCase());
  if (index === -1) {
    return { success: false, error: 'Coupon not found' };
  }

  coupons[index] = { ...coupons[index], active: false };
  setCouponState(coupons);
  return { success: true, data: { code, userId } };
}

export async function getAnnouncementBarMessage() {
  if (API_BASE_URL) {
    const remote = await cachedRemoteRequest(cacheKeyFor('announcement'), 10 * 60 * 1000, () => request('/announcement'));
    if (remote.success) {
      return remote;
    }
  }

  return { success: true, data: getAnnouncementFallback() };
}

export async function updateAnnouncementBarMessage(message) {
  if (API_BASE_URL) {
    return request('/announcement', { method: 'PUT', body: JSON.stringify({ message }) });
  }

  setAnnouncementFallback(message);
  return { success: true, data: message };
}

export function subscribeToInventoryUpdates(callback) {
  if (API_BASE_URL) {
    const interval = window.setInterval(async () => {
      const result = await getInventoryByProductIds(seedCatalog.map(product => product.id).slice(0, 16));
      if (result.success) {
        result.data.forEach(item => callback?.(item));
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }

  return () => {};
}

export function subscribeCatalogRealtime(callback) {
  return subscribeToInventoryUpdates(callback);
}

export async function getInventoryTaxonomyFallback() {
  return getTaxonomyTree();
}

export function getImageDeliveryUrl(imageUrl, width = 900) {
  const source = String(imageUrl || '').trim();
  if (!source) {
    return 'https://placehold.co/900x1125?text=Product';
  }

  if (!IMAGE_BASE_URL) {
    return source;
  }

  const safeWidth = Math.max(160, Math.floor(Number(width) || 900));
  const separator = IMAGE_BASE_URL.includes('?') ? '&' : '?';
  return `${IMAGE_BASE_URL}${separator}src=${encodeURIComponent(source)}&w=${safeWidth}&format=webp`;
}

export async function getInventoryByProductIdsLocal(productIds = []) {
  return getInventoryByProductIds(productIds);
}

export const cloudflareConfig = {
  apiBaseUrl: API_BASE_URL || null,
  imageBaseUrl: IMAGE_BASE_URL || null,
  devMode: DEV_MODE
};