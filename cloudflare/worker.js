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
  return 'SELECT * FROM products';
}

function parseJsonPayload(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normalizeMediaView(view, fallbackLabel, fallbackColor) {
  const entry = typeof view === 'string' ? { image_url: view } : (view || {});
  const imageUrl = String(entry.image_url || entry.url || entry.image || entry.src || '').trim();
  if (!imageUrl) {
    return null;
  }

  return {
    label: String(entry.label || entry.view_name || entry.angle || fallbackLabel || 'View').trim(),
    url: imageUrl,
    image_url: imageUrl,
    alt_text: String(entry.alt_text || entry.alt || `${fallbackColor || 'Product'} ${fallbackLabel || 'view'}`).trim()
  };
}

async function fetchProductMedia(env, productId) {
  try {
    const result = await env.DB.prepare(
      'SELECT id, product_id, color_name, color_hex, view_name, sort_order, image_url, alt_text, active FROM product_media WHERE product_id = ? AND active = 1 ORDER BY sort_order ASC, color_name ASC, view_name ASC'
    ).bind(String(productId)).all();

    return result.results || [];
  } catch (_error) {
    // Older databases may not have product_media yet. Fall back to variants/media_json in products row.
    return [];
  }
}

function hydrateMediaVariants(product, mediaRows = []) {
  const existingVariants = parseJsonPayload(product?.variants, []);
  const existingGallery = parseJsonPayload(product?.media_json || product?.media_gallery, []);

  if (Array.isArray(existingVariants) && existingVariants.length > 0) {
    return {
      ...product,
      variants: existingVariants,
      media_json: Array.isArray(existingGallery) ? existingGallery : [],
      media_gallery: Array.isArray(existingGallery) ? existingGallery : []
    };
  }

  if (!Array.isArray(mediaRows) || mediaRows.length === 0) {
    return {
      ...product,
      variants: Array.isArray(existingVariants) ? existingVariants : [],
      media_json: Array.isArray(existingGallery) ? existingGallery : [],
      media_gallery: Array.isArray(existingGallery) ? existingGallery : []
    };
  }

  const grouped = new Map();
  const explicitColors = new Map();
  const isDefaultColor = value => {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || normalized === 'default' || normalized === 'na' || normalized === 'n/a';
  };

  mediaRows.forEach(row => {
    const rawName = String(row.color_name || '').trim();
    if (!isDefaultColor(rawName)) {
      explicitColors.set(rawName, String(row.color_hex || '#d9c7d2').trim() || '#d9c7d2');
    }
  });

  const singleExplicitColorName = explicitColors.size === 1 ? [...explicitColors.keys()][0] : null;
  mediaRows.forEach(row => {
    const rawColorName = String(row.color_name || 'Default').trim() || 'Default';
    const colorName = isDefaultColor(rawColorName) && singleExplicitColorName ? singleExplicitColorName : rawColorName;
    const explicitHex = explicitColors.get(colorName);
    const colorHex = String(explicitHex || row.color_hex || '#d9c7d2').trim() || '#d9c7d2';
    if (!grouped.has(colorName)) {
      grouped.set(colorName, { color: colorName, hex: colorHex, views: [] });
    }

    const view = normalizeMediaView(row, row.view_name || 'View', colorName);
    if (view) {
      grouped.get(colorName).views.push({
        label: row.view_name || view.label,
        url: view.url,
        image_url: view.image_url,
        alt_text: view.alt_text,
        sort_order: Number(row.sort_order || 0)
      });
    }
  });

  const mediaVariants = [...grouped.values()].map(variant => ({
    ...variant,
    views: variant.views.sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0)).map(({ sort_order, ...view }) => view)
  }));

  const flatGallery = mediaVariants.flatMap(variant => variant.views.map(view => ({
    color: variant.color,
    hex: variant.hex,
    ...view
  })));

  return {
    ...product,
    variants: mediaVariants,
    media_json: flatGallery,
    media_gallery: flatGallery
  };
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
    const mediaSchemaVersion = Number(body.media_schema_version || 1);
    const activeValue = body.active;
    const active = activeValue === false || Number(activeValue) === 0 ? 0 : 1;
    const bestsellerValue = body.bestseller ?? body.best_seller;
    const bestseller = bestsellerValue === true || Number(bestsellerValue) === 1 ? 1 : 0;
    const newArrivalValue = body.new_arrival ?? body.new_arrivals;
    const newArrival = newArrivalValue === true || Number(newArrivalValue) === 1 ? 1 : 0;

    await env.DB.prepare(
      'INSERT INTO products (id, name, category, subcategory, price, image_url, description, stock, active, discount, taxonomy_id, created_at, media_schema_version, bestseller, new_arrival) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), ?, ?, ?)'
    ).bind(
      id,
      body.name || 'Product',
      body.category || 'General',
      body.subcategory || '',
      Number(body.price || 0),
      body.image_url || body.image || '',
      body.description || '',
      Number(body.stock || 0),
      active,
      Number(body.discount || 0),
      body.taxonomy_id || null,
      Number.isFinite(mediaSchemaVersion) ? mediaSchemaVersion : 1,
      bestseller,
      newArrival
    ).run();

    const mediaRows = Array.isArray(body.product_media) ? body.product_media : [];
    if (mediaRows.length > 0) {
      const normalizedMedia = mediaRows.map((row, index) => ({
        id: String(row.id || crypto.randomUUID()),
        product_id: id,
        color_name: String(row.color_name || row.color || 'Default').trim() || 'Default',
        color_hex: String(row.color_hex || row.hex || '#d9c7d2').trim() || '#d9c7d2',
        view_name: String(row.view_name || row.label || `View ${index + 1}`).trim() || `View ${index + 1}`,
        sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index + 1,
        image_url: String(row.image_url || row.url || row.image || row.src || '').trim(),
        alt_text: String(row.alt_text || row.alt || '').trim(),
        active: row.active === false ? 0 : 1
      })).filter(row => Boolean(row.image_url));

      if (normalizedMedia.length > 0) {
        const statements = normalizedMedia.map(row =>
          env.DB.prepare(
            'INSERT INTO product_media (id, product_id, color_name, color_hex, view_name, sort_order, image_url, alt_text, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
          ).bind(
            row.id,
            row.product_id,
            row.color_name,
            row.color_hex,
            row.view_name,
            row.sort_order,
            row.image_url,
            row.alt_text,
            row.active
          )
        );
        await env.DB.batch(statements);
      }
    }

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

  const mediaRows = await fetchProductMedia(env, id);
  return json({ success: true, data: hydrateMediaVariants(product, mediaRows) }, { headers: corsHeaders(allowedOrigin) });
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

function isAuthorizedR2Purge(request, env) {
  const secret = String(env.ADMIN_R2_PURGE_SECRET || '').trim();
  if (!secret) {
    return false;
  }

  const headerSecret = String(request.headers.get('x-admin-secret') || '').trim();
  const bearerSecret = String(request.headers.get('authorization') || '').trim().replace(/^Bearer\s+/i, '');
  return headerSecret === secret || bearerSecret === secret;
}

async function handleR2Purge(request, env, url, allowedOrigin) {
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(allowedOrigin) });
  }

  if (!env.MEDIA_BUCKET) {
    return json({ success: false, error: 'MEDIA_BUCKET binding missing' }, { status: 500, headers: corsHeaders(allowedOrigin) });
  }

  if (!isAuthorizedR2Purge(request, env)) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders(allowedOrigin) });
  }

  const body = await readJson(request);
  const prefix = String(body.prefix || url.searchParams.get('prefix') || '').trim();
  const batchSize = 1000;
  let cursor;
  let deleted = 0;
  let scanned = 0;

  do {
    const listing = await env.MEDIA_BUCKET.list({ prefix, cursor, limit: batchSize });
    const keys = (listing.objects || []).map(object => object.key).filter(Boolean);
    scanned += keys.length;

    if (keys.length > 0) {
      await env.MEDIA_BUCKET.delete(keys);
      deleted += keys.length;
    }

    cursor = listing.truncated ? listing.cursor : null;
  } while (cursor);

  return json({ success: true, deleted, scanned, prefix: prefix || '' }, { headers: corsHeaders(allowedOrigin) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get('origin') || '';
    const allowedOrigin = getAllowedOrigin(requestOrigin, env);
    
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders(allowedOrigin, true) });
      }

      const pathname = url.pathname.replace(/\/$/, '');

      if (pathname.startsWith('/media/')) {
        return handleMediaRequest(request, env, pathname);
      }

      if (pathname === '/api/admin/r2/purge') {
        return handleR2Purge(request, env, url, allowedOrigin);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
      console.error('Worker error:', errorMessage, error);
      return json(
        { success: false, error: 'Internal server error', details: errorMessage },
        { status: 500, headers: corsHeaders(allowedOrigin) }
      );
    }
  }
};
