function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {})
    }
  });
}

function corsHeaders(origin = '*', allowCredentials = false) {
  const headers = {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type, authorization, x-requested-with, cookie',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-max-age': '86400'
  };

  if ((allowCredentials || origin !== '*') && origin !== '*') {
    headers['access-control-allow-credentials'] = 'true';
  }

  return headers;
}

function getAllowedOrigin(requestOrigin, env) {
  const normalizedOrigin = String(requestOrigin || '').trim();
  const isLocalhostOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin);
  if (isLocalhostOrigin) {
    return normalizedOrigin;
  }

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    env.APP_ORIGIN,
    `https://${env.APP_ORIGIN}`
  ];
  
  if (allowedOrigins.includes(normalizedOrigin)) {
    return normalizedOrigin;
  }
  
  return env.APP_ORIGIN ? `https://${env.APP_ORIGIN}` : '*';
}

function sessionCookieAttributes(origin, token) {
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
  const sameSite = isLocalhost ? 'None' : 'Lax';
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=${sameSite}`;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (_error) {
    return {};
  }
}

function cookieMap(request) {
  const header = request.headers.get('cookie') || '';
  return header.split(';').reduce((accumulator, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) {
      return accumulator;
    }
    accumulator[rawKey] = rawValue.join('=');
    return accumulator;
  }, {});
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function getSessionUser(request, env) {
  const cookies = cookieMap(request);
  const token = cookies.session;
  if (!token) {
    return null;
  }

  const sessionRow = await env.DB.prepare('SELECT user_id FROM sessions WHERE token = ? LIMIT 1').bind(token).first();
  if (!sessionRow) {
    return null;
  }

  const user = await env.DB.prepare('SELECT id, email, user_json FROM users WHERE id = ? LIMIT 1').bind(sessionRow.user_id).first();
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    user_metadata: JSON.parse(user.user_json || '{}')
  };
}

async function upsertSession(env, userId) {
  const token = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, datetime("now"))').bind(token, userId).run();
  return token;
}

function productBaseQuery() {
  return 'SELECT id, name, category, subcategory, price, image_url, description, stock, active, discount, created_at, taxonomy_id FROM products';
}

function applyProductFilters(sql, query) {
  const conditions = [];
  const bindings = [];

  if (query.get('category')) {
    conditions.push('LOWER(category) = LOWER(?)');
    bindings.push(query.get('category'));
  }

  if (query.get('subcategory')) {
    conditions.push('LOWER(subcategory) = LOWER(?)');
    bindings.push(query.get('subcategory'));
  }

  if (query.get('search')) {
    conditions.push('(LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))');
    const pattern = `%${query.get('search')}%`;
    bindings.push(pattern, pattern);
  }

  if (query.get('minPrice')) {
    conditions.push('price >= ?');
    bindings.push(Number(query.get('minPrice')) || 0);
  }

  if (query.get('maxPrice')) {
    conditions.push('price <= ?');
    bindings.push(Number(query.get('maxPrice')) || 0);
  }

  if (query.get('onlyActive') !== 'false') {
    conditions.push('active = 1');
  }

  if (query.get('clearance') === 'true') {
    conditions.push('(discount > 0 OR LOWER(category) LIKE ?)');
    bindings.push('%clearance%');
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  const sort = query.get('sort') || 'newest';
  if (sort === 'price-asc') {
    sql += ' ORDER BY price ASC';
  } else if (sort === 'price-desc') {
    sql += ' ORDER BY price DESC';
  } else if (sort === 'name-asc') {
    sql += ' ORDER BY name ASC';
  } else if (sort === 'name-desc') {
    sql += ' ORDER BY name DESC';
  } else {
    sql += ' ORDER BY datetime(created_at) DESC';
  }

  const limit = Number(query.get('limit') || 20);
  const offset = Number(query.get('offset') || 0);
  sql += ' LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  return { sql, bindings };
}

async function handleProducts(request, env, url, allowedOrigin) {
  if (request.method === 'GET') {
    const { sql, bindings } = applyProductFilters(productBaseQuery(), url.searchParams);
    const result = await env.DB.prepare(sql).bind(...bindings).all();
    return json({ success: true, data: result.results || [] }, { headers: corsHeaders(allowedOrigin) });
  }

  if (request.method === 'POST') {
    const body = await readJson(request);
    const id = body.id || crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO products (id, name, category, subcategory, price, image_url, description, stock, active, discount, taxonomy_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(
      id,
      body.name || 'Product',
      body.category || 'General',
      body.subcategory || '',
      Number(body.price || 0),
      body.image_url || body.image || '',
      body.description || '',
      Number(body.stock || 0),
      body.active === false ? 0 : 1,
      Number(body.discount || 0),
      body.taxonomy_id || null
    ).run();
    return json({ success: true, data: { id } }, { status: 201, headers: corsHeaders(allowedOrigin) });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
}

async function handleProductById(request, env, url, id, allowedOrigin) {
  if (request.method !== 'GET') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
  }

  const product = await env.DB.prepare(`${productBaseQuery()} WHERE id = ? LIMIT 1`).bind(id).first();
  if (!product) {
    return json({ success: false, error: 'Product not found' }, { status: 404, headers: corsHeaders(allowedOrigin) });
  }

  return json({ success: true, data: product }, { headers: corsHeaders(allowedOrigin) });
}

async function handleClearance(request, env, url, allowedOrigin) {
  const clearanceUrl = new URL(request.url);
  clearanceUrl.searchParams.set('clearance', 'true');
  const { sql, bindings } = applyProductFilters(productBaseQuery(), clearanceUrl);
  const result = await env.DB.prepare(sql).bind(...bindings).all();
  return json({ success: true, data: result.results || [] }, { headers: corsHeaders(allowedOrigin) });
}

async function handleClearanceCategories(request, env, url, allowedOrigin) {
  const result = await env.DB.prepare(
    'SELECT DISTINCT category FROM products WHERE active = 1 AND (discount > 0 OR LOWER(category) LIKE ?) ORDER BY category ASC'
  ).bind('%clearance%').all();
  return json({ success: true, data: (result.results || []).map(row => row.category).filter(Boolean) }, { headers: corsHeaders(allowedOrigin) });
}

async function handleTaxonomy(request, env, url, allowedOrigin) {
  const result = await env.DB.prepare('SELECT id, name, slug, parent_id, depth, sort_order, image_url, active FROM taxonomy WHERE active = 1 ORDER BY depth ASC, sort_order ASC, name ASC').all();
  return json({ success: true, data: result.results || [] }, { headers: corsHeaders(allowedOrigin) });
}

async function ensureInventoryRow(env, productId) {
  const normalizedId = String(productId || '').trim();
  if (!normalizedId) {
    return { found: false, stock: 0 };
  }

  const inventoryRow = await env.DB.prepare('SELECT stock FROM inventory WHERE product_id = ? LIMIT 1').bind(normalizedId).first();
  if (inventoryRow) {
    return { found: true, stock: Number(inventoryRow.stock || 0) };
  }

  const productRow = await env.DB.prepare('SELECT stock FROM products WHERE id = ? LIMIT 1').bind(normalizedId).first();
  if (!productRow) {
    return { found: false, stock: 0 };
  }

  const stock = Number(productRow.stock || 0);
  await env.DB.prepare(
    'INSERT INTO inventory (product_id, stock, updated_at) VALUES (?, ?, datetime("now")) ON CONFLICT(product_id) DO NOTHING'
  ).bind(normalizedId, stock).run();

  return { found: true, stock };
}

async function handleInventory(request, env, url, allowedOrigin) {
  const ids = String(url.searchParams.get('ids') || '')
    .split(',')
    .map(value => String(value).trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return json({ success: true, data: [] }, { headers: corsHeaders(allowedOrigin) });
  }

  const placeholders = ids.map(() => '?').join(',');
  const inventoryResult = await env.DB.prepare(`SELECT product_id AS id, stock FROM inventory WHERE product_id IN (${placeholders})`).bind(...ids).all();
  const rows = inventoryResult.results || [];
  const foundIds = new Set(rows.map(row => String(row.id)));
  const missingIds = ids.filter(id => !foundIds.has(id));

  if (missingIds.length === 0) {
    return json({ success: true, data: rows }, { headers: corsHeaders(allowedOrigin) });
  }

  const syncedRows = [];
  for (const productId of missingIds) {
    const ensured = await ensureInventoryRow(env, productId);
    if (ensured.found) {
      syncedRows.push({ id: productId, stock: ensured.stock });
    }
  }

  return json({ success: true, data: [...rows, ...syncedRows] }, { headers: corsHeaders(allowedOrigin) });
}

async function handleReserveInventory(request, env, url, allowedOrigin) {
  const body = await readJson(request);
  const items = Array.isArray(body.items) ? body.items : [];

  for (const item of items) {
    const ensured = await ensureInventoryRow(env, item.id);
    if (!ensured.found) {
      return json({ success: false, error: `Product not found: ${item.id}` }, { status: 404, headers: corsHeaders(allowedOrigin) });
    }

    const currentStock = Number(ensured.stock || 0);
    if (Number(item.quantity || 0) > currentStock) {
      return json({ success: false, error: `Insufficient stock for product ${item.id}` }, { status: 409, headers: corsHeaders(allowedOrigin) });
    }
  }

  const batch = env.DB.batch(items.map(item =>
    env.DB.prepare('UPDATE inventory SET stock = stock - ? WHERE product_id = ?').bind(Number(item.quantity || 0), String(item.id))
  ));

  await batch;
  return json({ success: true, data: { reserved: true } }, { headers: corsHeaders(allowedOrigin) });
}

async function handleReleaseInventory(request, env, url, allowedOrigin) {
  const body = await readJson(request);
  const items = Array.isArray(body.items) ? body.items : [];
  const batch = env.DB.batch(items.map(item =>
    env.DB.prepare('UPDATE inventory SET stock = stock + ? WHERE product_id = ?').bind(Number(item.quantity || 0), String(item.id))
  ));
  await batch;
  return json({ success: true }, { headers: corsHeaders(allowedOrigin) });
}

async function handleOrders(request, env, url, allowedOrigin) {
  if (request.method === 'GET') {
    const userId = url.searchParams.get('userId');
    const result = await env.DB.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY datetime(created_at) DESC').bind(userId).all();
    const orders = (result.results || []).map(order => ({
      ...order,
      items: JSON.parse(order.items_json || '[]'),
      shipping_address: JSON.parse(order.shipping_json || '{}')
    }));
    return json({ success: true, data: orders }, { headers: corsHeaders(allowedOrigin) });
  }

  if (request.method === 'POST') {
    const body = await readJson(request);
    const orderId = `order_${Date.now()}`;
    await env.DB.prepare(
      'INSERT INTO orders (id, user_id, items_json, total_amount, shipping_json, status, payment_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(
      orderId,
      String(body.userId || ''),
      JSON.stringify(Array.isArray(body.items) ? body.items : []),
      Number(body.totalAmount || 0),
      JSON.stringify(body.shippingAddress || {}),
      'pending',
      'pending'
    ).run();
    return json({ success: true, data: { id: orderId } }, { status: 201, headers: corsHeaders(allowedOrigin) });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
}

async function handleOrderById(request, env, url, orderId, allowedOrigin) {
  if (request.method !== 'PUT') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
  }

  const body = await readJson(request);
  await env.DB.prepare(
    'UPDATE orders SET status = COALESCE(?, status), payment_status = COALESCE(?, payment_status), razorpay_payment_id = COALESCE(?, razorpay_payment_id), razorpay_order_id = COALESCE(?, razorpay_order_id), updated_at = datetime("now") WHERE id = ?'
  ).bind(
    body.status || null,
    body.payment_status || null,
    body.razorpay_payment_id || null,
    body.razorpay_order_id || null,
    orderId
  ).run();

  return json({ success: true, data: { id: orderId } }, { headers: corsHeaders(allowedOrigin) });
}

async function handleCoupons(request, env, url, allowedOrigin) {
  if (request.method === 'POST' && url.pathname.endsWith('/validate')) {
    const body = await readJson(request);
    const coupon = await env.DB.prepare('SELECT code, discount_percent, active FROM coupons WHERE LOWER(code) = LOWER(?) LIMIT 1').bind(String(body.code || '')).first();
    if (!coupon || Number(coupon.active) !== 1) {
      return json({ success: false, error: 'Invalid coupon code' }, { status: 404, headers: corsHeaders(allowedOrigin) });
    }

    const amount = Number(body.amount || 0);
    const discountAmount = (amount * Number(coupon.discount_percent || 0)) / 100;
    return json({ success: true, data: { code: coupon.code, discount: Number(coupon.discount_percent || 0), discountAmount } }, { headers: corsHeaders(allowedOrigin) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/redeem')) {
    const body = await readJson(request);
    await env.DB.prepare('INSERT INTO coupon_redemptions (coupon_code, user_id, redeemed_at) VALUES (?, ?, datetime("now"))').bind(String(body.code || ''), String(body.userId || '')).run();
    return json({ success: true, data: { code: body.code, userId: body.userId } }, { headers: corsHeaders(allowedOrigin) });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
}

async function handleAnnouncement(request, env, url, allowedOrigin) {
  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT message FROM announcements ORDER BY id DESC LIMIT 1').first();
    return json({ success: true, data: row?.message || 'FREE SHIPPING ON ORDERS OVER ₹999 • NEW ARRIVALS JUST LANDED' }, { headers: corsHeaders(allowedOrigin) });
  }

  if (request.method === 'PUT') {
    const body = await readJson(request);
    await env.DB.prepare('INSERT INTO announcements (message, created_at) VALUES (?, datetime("now"))').bind(String(body.message || '')).run();
    return json({ success: true, data: body.message || '' }, { headers: corsHeaders(allowedOrigin) });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
}

async function handleAuth(request, env, url, allowedOrigin) {
  if (request.method === 'POST' && url.pathname.endsWith('/sign-up')) {
    const body = await readJson(request);
    const passwordHash = await sha256(body.password || '');
    const userId = `user_${Date.now()}`;
    await env.DB.prepare('INSERT INTO users (id, email, password_hash, user_json, created_at) VALUES (?, ?, ?, ?, datetime("now"))').bind(
      userId,
      String(body.email || '').toLowerCase(),
      passwordHash,
      JSON.stringify(body.userData || {})
    ).run();
    const token = await upsertSession(env, userId);
    const user = { id: userId, email: String(body.email || '').toLowerCase(), user_metadata: body.userData || {} };
    return json({ success: true, data: { user, session: { access_token: token } } }, { headers: { ...corsHeaders(allowedOrigin, true), 'set-cookie': `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/sign-in')) {
    const body = await readJson(request);
    const normalizedEmail = String(body.email || '').toLowerCase();
    const plainPassword = String(body.password || '');
    const passwordHash = await sha256(plainPassword);
    let user = await env.DB.prepare('SELECT id, email, user_json FROM users WHERE LOWER(email) = LOWER(?) AND password_hash = ? LIMIT 1').bind(normalizedEmail, passwordHash).first();

    // First-time helper: allow demo credentials in backend mode by provisioning demo user.
    if (!user && normalizedEmail === 'demo@onestopshop.com' && plainPassword === 'Demo@123') {
      const demoId = 'demo-user';
      const demoHash = await sha256('Demo@123');
      const demoMetadata = JSON.stringify({
        first_name: 'Demo',
        last_name: 'User',
        display_name: 'Demo User'
      });

      const existingDemo = await env.DB.prepare('SELECT id FROM users WHERE id = ? LIMIT 1').bind(demoId).first();
      if (!existingDemo) {
        await env.DB.prepare('INSERT INTO users (id, email, password_hash, user_json, created_at) VALUES (?, ?, ?, ?, datetime("now"))')
          .bind(demoId, 'demo@onestopshop.com', demoHash, demoMetadata)
          .run();
      }

      user = await env.DB.prepare('SELECT id, email, user_json FROM users WHERE id = ? LIMIT 1').bind(demoId).first();
    }

    if (!user) {
      return json({ success: false, error: 'Invalid email or password' }, { status: 401, headers: corsHeaders(allowedOrigin) });
    }

    const token = await upsertSession(env, user.id);
    return json({ success: true, data: { user: { id: user.id, email: user.email, user_metadata: JSON.parse(user.user_json || '{}') }, session: { access_token: token } } }, { headers: { ...corsHeaders(allowedOrigin, true), 'set-cookie': sessionCookieAttributes(allowedOrigin, token) } });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/sign-out')) {
    const cookies = cookieMap(request);
    if (cookies.session) {
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(cookies.session).run();
    }
    return json({ success: true }, { headers: { ...corsHeaders(allowedOrigin, true), 'set-cookie': 'session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax' } });
  }

  if (request.method === 'GET' && url.pathname.endsWith('/me')) {
    const user = await getSessionUser(request, env);
    return json({ success: true, data: user }, { headers: corsHeaders(allowedOrigin) });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
}

async function handleWishlist(request, env, url, allowedOrigin) {
  const user = await getSessionUser(request, env);
  if (!user) {
    return json({ success: false, error: 'Please login first' }, { status: 401, headers: corsHeaders(allowedOrigin) });
  }

  if (request.method === 'GET') {
    const result = await env.DB.prepare('SELECT product_id FROM wishlist_items WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
    return json({ success: true, data: (result.results || []).map(row => String(row.product_id)) }, { headers: corsHeaders(allowedOrigin) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/toggle')) {
    const body = await readJson(request);
    const productId = String(body.productId || '').trim();
    if (!productId) {
      return json({ success: false, error: 'Invalid product id' }, { status: 400, headers: corsHeaders(allowedOrigin) });
    }
    const existing = await env.DB.prepare('SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ? LIMIT 1').bind(user.id, productId).first();
    if (existing) {
      await env.DB.prepare('DELETE FROM wishlist_items WHERE id = ?').bind(existing.id).run();
      return json({ success: true, active: false }, { headers: corsHeaders(allowedOrigin) });
    }

    await env.DB.prepare('INSERT INTO wishlist_items (id, user_id, product_id, created_at) VALUES (?, ?, ?, datetime("now"))').bind(crypto.randomUUID(), user.id, productId).run();
    return json({ success: true, active: true }, { headers: corsHeaders(allowedOrigin) });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
}

async function handleCompare(request, env, url, allowedOrigin) {
  const user = await getSessionUser(request, env);
  if (!user) {
    return json({ success: false, error: 'Please login first' }, { status: 401, headers: corsHeaders(allowedOrigin) });
  }

  if (request.method === 'GET') {
    const result = await env.DB.prepare('SELECT product_id FROM compare_items WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
    return json({ success: true, data: (result.results || []).map(row => String(row.product_id)) }, { headers: corsHeaders(allowedOrigin) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/toggle')) {
    const body = await readJson(request);
    const productId = String(body.productId || '').trim();
    if (!productId) {
      return json({ success: false, error: 'Invalid product id' }, { status: 400, headers: corsHeaders(allowedOrigin) });
    }
    const existingCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM compare_items WHERE user_id = ?').bind(user.id).first();
    const existing = await env.DB.prepare('SELECT id FROM compare_items WHERE user_id = ? AND product_id = ? LIMIT 1').bind(user.id, productId).first();

    if (existing) {
      await env.DB.prepare('DELETE FROM compare_items WHERE id = ?').bind(existing.id).run();
      return json({ success: true, active: false }, { headers: corsHeaders(allowedOrigin) });
    }

    if (Number(existingCount?.count || 0) >= 4) {
      return json({ success: false, error: 'Compare limit reached' }, { status: 409, headers: corsHeaders(allowedOrigin) });
    }

    await env.DB.prepare('INSERT INTO compare_items (id, user_id, product_id, created_at) VALUES (?, ?, ?, datetime("now"))').bind(crypto.randomUUID(), user.id, productId).run();
    return json({ success: true, active: true }, { headers: corsHeaders(allowedOrigin) });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
}

async function handleOrdersDeleteRelease(request, env, url, allowedOrigin) {
  return json({ success: false, error: 'Not implemented' }, { status: 404, headers: corsHeaders(allowedOrigin) });
}

async function handleMediaRequest(request, env, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const key = decodeURIComponent(pathname.replace(/^\/media\//, '')).trim();
  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (!headers.get('content-type')) {
    headers.set('content-type', 'application/octet-stream');
  }

  if (request.method === 'HEAD') {
    return new Response(null, { headers });
  }

  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get('origin') || '';
    const allowedOrigin = getAllowedOrigin(requestOrigin, env);
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(allowedOrigin, true) });
    }

    const pathname = url.pathname.replace(/\/$/, '');

    if (pathname.startsWith('/media/')) {
      return handleMediaRequest(request, env, pathname);
    }

    if (pathname === '/health') {
      return json({ success: true, status: 'ok' }, { headers: corsHeaders(allowedOrigin) });
    }

    if (pathname === '/api/announcement') {
      return handleAnnouncement(request, env, url, allowedOrigin);
    }

    if (pathname.startsWith('/api/auth')) {
      return handleAuth(request, env, url, allowedOrigin);
    }

    if (pathname === '/api/taxonomy') {
      return handleTaxonomy(request, env, url, allowedOrigin);
    }

    if (pathname === '/api/products') {
      return handleProducts(request, env, url, allowedOrigin);
    }

    if (pathname === '/api/products/clearance') {
      return handleClearance(request, env, url, allowedOrigin);
    }

    if (pathname === '/api/products/clearance/categories') {
      return handleClearanceCategories(request, env, url, allowedOrigin);
    }

    if (pathname.startsWith('/api/products/')) {
      const id = pathname.split('/').pop();
      return handleProductById(request, env, url, id, allowedOrigin);
    }

    if (pathname === '/api/inventory') {
      return handleInventory(request, env, url, allowedOrigin);
    }

    if (pathname === '/api/inventory/reserve') {
      return handleReserveInventory(request, env, url, allowedOrigin);
    }

    if (pathname === '/api/inventory/release') {
      return handleReleaseInventory(request, env, url, allowedOrigin);
    }

    if (pathname === '/api/orders') {
      return handleOrders(request, env, url, allowedOrigin);
    }

    if (pathname.startsWith('/api/orders/')) {
      const orderId = pathname.split('/').pop();
      return handleOrderById(request, env, url, orderId, allowedOrigin);
    }

    if (pathname === '/api/coupons/validate' || pathname === '/api/coupons/redeem') {
      return handleCoupons(request, env, url, allowedOrigin);
    }

    if (pathname === '/api/wishlist' || pathname === '/api/wishlist/toggle') {
      return handleWishlist(request, env, url, allowedOrigin);
    }

    if (pathname === '/api/compare' || pathname === '/api/compare/toggle') {
      return handleCompare(request, env, url, allowedOrigin);
    }

    return json({ success: false, error: 'Route not found' }, { status: 404, headers: corsHeaders(allowedOrigin) });
  }
};
