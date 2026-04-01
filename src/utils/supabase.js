import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
const isRealtimeEnabled = String(import.meta.env.VITE_ENABLE_REALTIME || 'false').trim().toLowerCase() === 'true'

const fallbackSupabaseUrl = 'https://placeholder.supabase.co'
const fallbackSupabaseAnonKey = 'placeholder-anon-key'

if (!hasSupabaseConfig) {
  console.error('Missing Supabase credentials. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file')
}

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : fallbackSupabaseUrl,
  hasSupabaseConfig ? supabaseAnonKey : fallbackSupabaseAnonKey
)

let storeSettingsTableUnavailable = false

// Authentication functions
export async function signUp(email, password, userData) {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Sign up error:', error.message)
    return { success: false, error: error.message }
  }
}

export async function signIn(email, password) {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Sign in error:', error.message)
    return { success: false, error: error.message }
  }
}

export async function signOut() {
  try {
    if (!hasSupabaseConfig) {
      return { success: true }
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Sign out error:', error.message)
    return { success: false, error: error.message }
  }
}

export async function getCurrentUser() {
  try {
    if (!hasSupabaseConfig) {
      return null
    }

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error('Get current user error:', error.message)
    return null
  }
}

export async function getSession() {
  try {
    if (!hasSupabaseConfig) {
      return null
    }

    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  } catch (error) {
    console.error('Get session error:', error.message)
    return null
  }
}

// Product functions
export async function getProducts(limit = 20, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Get products error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getProductsCatalog(options = {}) {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: [] }
    }

    const {
      limit = 20,
      offset = 0,
      category,
      subcategory,
      search,
      minPrice,
      maxPrice,
      sort = 'newest',
      onlyActive = true
    } = options

    let query = supabase
      .from('products')
      .select('*')
      .range(offset, offset + limit - 1)

    if (onlyActive) {
      query = query.eq('active', true)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (subcategory) {
      query = query.eq('subcategory', subcategory)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (Number.isFinite(Number(minPrice))) {
      query = query.gte('price', Number(minPrice))
    }

    if (Number.isFinite(Number(maxPrice))) {
      query = query.lte('price', Number(maxPrice))
    }

    if (sort === 'price-asc') {
      query = query.order('price', { ascending: true })
    } else if (sort === 'price-desc') {
      query = query.order('price', { ascending: false })
    } else if (sort === 'name-asc') {
      query = query.order('name', { ascending: true })
    } else if (sort === 'name-desc') {
      query = query.order('name', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query
    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Get products catalog error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getInventoryTaxonomy() {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: [] }
    }

    const { data, error } = await supabase
      .from('inventory_taxonomy')
      .select('category, subcategory, sort_order, active')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Get inventory taxonomy error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

function normalizeSort(sort) {
  if (sort === 'price-asc') {
    return { column: 'price', ascending: true }
  }
  if (sort === 'price-desc') {
    return { column: 'price', ascending: false }
  }
  if (sort === 'name-asc') {
    return { column: 'name', ascending: true }
  }
  if (sort === 'name-desc') {
    return { column: 'name', ascending: false }
  }
  return { column: 'created_at', ascending: false }
}

async function getAuthUserId() {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data?.user?.id || null
  } catch (_error) {
    return null
  }
}

function isMissingSchemaError(error) {
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()
  return (
    message.includes('does not exist') ||
    message.includes('could not find') ||
    message.includes('schema cache') ||
    details.includes('does not exist')
  )
}

async function getCategoryIdsByNames(names = []) {
  if (!Array.isArray(names) || names.length === 0) {
    return []
  }

  const normalized = names
    .map(item => String(item || '').trim())
    .filter(Boolean)

  if (normalized.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .in('name', normalized)

  if (error) {
    return []
  }

  return (data || []).map(item => Number(item.id)).filter(id => Number.isFinite(id))
}

export async function getTaxonomyTree() {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: [] }
    }

    const { data, error } = await supabase
      .from('inventory_taxonomy')
      .select('id, name, slug, parent_id, depth, sort_order, image_url, active')
      .eq('active', true)
      .order('depth', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      if (!isMissingSchemaError(error)) {
        throw error
      }

      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, parent_id, active, type')
        .eq('active', true)
        .in('type', ['Shop', 'Both'])
        .order('name', { ascending: true })

      if (categoriesError) {
        throw categoriesError
      }

      const mapped = (categories || []).map(item => ({
        id: Number(item.id),
        name: item.name,
        slug: String(item.name || '').toLowerCase().replace(/\s+/g, '-'),
        parent_id: item.parent_id || null,
        depth: item.parent_id ? 2 : 1,
        sort_order: 0,
        image_url: null,
        active: true
      }))

      return { success: true, data: mapped }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Get taxonomy tree error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getProductsCatalogAdvanced(options = {}) {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: [] }
    }

    const {
      taxonomyIds = [],
      search,
      minPrice,
      maxPrice,
      availability = 'all',
      sort = 'newest',
      limit = 120,
      offset = 0,
      onlyActive = true
    } = options

    const applyBaseFilters = queryBuilder => {
      let query = queryBuilder.range(offset, offset + limit - 1)

      if (onlyActive) {
        query = query.eq('active', true)
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      if (Number.isFinite(Number(minPrice))) {
        query = query.gte('price', Number(minPrice))
      }

      if (Number.isFinite(Number(maxPrice))) {
        query = query.lte('price', Number(maxPrice))
      }

      if (availability === 'in-stock') {
        query = query.gt('stock', 0)
      } else if (availability === 'out-of-stock') {
        query = query.lte('stock', 0)
      } else if (availability === 'low-stock') {
        query = query.gt('stock', 0).lte('stock', 3)
      }

      const sortConfig = normalizeSort(sort)
      return query.order(sortConfig.column, { ascending: sortConfig.ascending })
    }

    const taxonomyIdsList = Array.isArray(taxonomyIds)
      ? taxonomyIds.map(id => Number(id)).filter(id => Number.isFinite(id))
      : []

    // Legacy schema path: products.taxonomy_id
    let legacyQuery = applyBaseFilters(
      supabase
        .from('products')
        .select('*')
    )

    if (taxonomyIdsList.length > 0) {
      legacyQuery = legacyQuery.in('taxonomy_id', taxonomyIdsList)
    }

    const legacyResult = await legacyQuery
    if (!legacyResult.error) {
      return { success: true, data: legacyResult.data || [] }
    }

    if (!isMissingSchemaError(legacyResult.error)) {
      throw legacyResult.error
    }

    // New schema path: products.category_id with categories table
    let modernQuery = applyBaseFilters(
      supabase
        .from('products')
        .select('*, categories:category_id(name)')
    )

    if (taxonomyIdsList.length > 0) {
      modernQuery = modernQuery.in('category_id', taxonomyIdsList)
    }

    const modernResult = await modernQuery
    if (modernResult.error) {
      throw modernResult.error
    }

    const normalized = (modernResult.data || []).map(item => ({
      ...item,
      category: item.category || item.categories?.name || null
    }))

    return { success: true, data: normalized }
  } catch (error) {
    console.error('Get advanced products catalog error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getUserWishlist() {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: [] }
    }

    const userId = await getAuthUserId()
    if (!userId) {
      return { success: true, data: [] }
    }

    const { data, error } = await supabase
      .from('user_wishlist')
      .select('product_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: (data || []).map(item => Number(item.product_id)) }
  } catch (error) {
    console.error('Get user wishlist error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

export async function toggleWishlistProductSync(productId) {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', active: false }
    }

    const userId = await getAuthUserId()
    if (!userId) {
      return { success: false, error: 'Please login first', active: false }
    }

    const id = Number(productId)
    const { data: existing, error: lookupError } = await supabase
      .from('user_wishlist')
      .select('product_id')
      .eq('user_id', userId)
      .eq('product_id', id)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (existing) {
      const { error } = await supabase
        .from('user_wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', id)

      if (error) throw error
      return { success: true, active: false }
    }

    const { error } = await supabase
      .from('user_wishlist')
      .insert({ user_id: userId, product_id: id })

    if (error) throw error
    return { success: true, active: true }
  } catch (error) {
    console.error('Toggle wishlist sync error:', error.message)
    return { success: false, error: error.message, active: false }
  }
}

export async function getUserCompare() {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: [] }
    }

    const userId = await getAuthUserId()
    if (!userId) {
      return { success: true, data: [] }
    }

    const { data, error } = await supabase
      .from('user_compare')
      .select('product_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: (data || []).map(item => Number(item.product_id)) }
  } catch (error) {
    console.error('Get user compare error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

export async function toggleCompareProductSync(productId) {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', active: false }
    }

    const userId = await getAuthUserId()
    if (!userId) {
      return { success: false, error: 'Please login first', active: false }
    }

    const id = Number(productId)
    const { data: existing, error: lookupError } = await supabase
      .from('user_compare')
      .select('product_id')
      .eq('user_id', userId)
      .eq('product_id', id)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (existing) {
      const { error } = await supabase
        .from('user_compare')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', id)

      if (error) throw error
      return { success: true, active: false }
    }

    const { error } = await supabase
      .from('user_compare')
      .insert({ user_id: userId, product_id: id })

    if (error) throw error
    return { success: true, active: true }
  } catch (error) {
    console.error('Toggle compare sync error:', error.message)
    return { success: false, error: error.message, active: false }
  }
}

export function subscribeCatalogRealtime(onChange) {
  if (!hasSupabaseConfig || !isRealtimeEnabled) {
    return () => {}
  }

  const channel = supabase
    .channel('catalog-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      payload => onChange?.({ table: 'products', payload })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'product_variants' },
      payload => onChange?.({ table: 'product_variants', payload })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_taxonomy' },
      payload => onChange?.({ table: 'inventory_taxonomy', payload })
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function getProduct(id) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Get product error:', error.message)
    return { success: false, error: error.message, data: null }
  }
}

export async function getInventoryByProductIds(productIds = []) {
  try {
    if (!hasSupabaseConfig) {
      return { success: true, data: [] }
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return { success: true, data: [] }
    }

    const ids = productIds
      .map(id => Number(id))
      .filter(id => Number.isFinite(id))

    if (ids.length === 0) {
      return { success: true, data: [] }
    }

    const { data, error } = await supabase
      .from('products')
      .select('id, stock, updated_at')
      .in('id', ids)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Get inventory error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

export function subscribeToInventoryUpdates(onInventoryChange) {
  if (!hasSupabaseConfig) {
    return () => {}
  }

  const channel = supabase
    .channel('inventory-updates')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'products' },
      payload => {
        if (typeof onInventoryChange === 'function') {
          onInventoryChange(payload.new)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function searchProducts(query) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Search products error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

// Order functions
export async function createOrder(userId, items, totalAmount, shippingAddress) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        items,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        status: 'pending',
        created_at: new Date()
      })
      .select()
    
    if (error) throw error
    return { success: true, data: data[0] }
  } catch (error) {
    console.error('Create order error:', error.message)
    return { success: false, error: error.message, data: null }
  }
}

export async function getOrders(userId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Get orders error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

export async function updateOrder(orderId, updates) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
    
    if (error) throw error
    return { success: true, data: data[0] }
  } catch (error) {
    console.error('Update order error:', error.message)
    return { success: false, error: error.message, data: null }
  }
}

export async function reserveInventory(items = []) {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: false }
    }

    const orderItems = Array.isArray(items)
      ? items.map(item => ({
          id: Number(item.id),
          quantity: Number(item.quantity || 0)
        }))
      : []

    if (orderItems.length === 0) {
      return { success: false, error: 'No inventory items provided', data: false }
    }

    const { data, error } = await supabase.rpc('reserve_inventory', {
      order_items: orderItems
    })

    if (error) throw error
    return { success: true, data: Boolean(data) }
  } catch (error) {
    console.error('Reserve inventory error:', error.message)
    return { success: false, error: error.message, data: false }
  }
}

export async function releaseInventory(items = []) {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: false }
    }

    const orderItems = Array.isArray(items)
      ? items.map(item => ({
          id: Number(item.id),
          quantity: Number(item.quantity || 0)
        }))
      : []

    if (orderItems.length === 0) {
      return { success: false, error: 'No inventory items provided', data: false }
    }

    const { data, error } = await supabase.rpc('release_inventory', {
      order_items: orderItems
    })

    if (error) throw error
    return { success: true, data: Boolean(data) }
  } catch (error) {
    console.error('Release inventory error:', error.message)
    return { success: false, error: error.message, data: false }
  }
}

// Coupon functions
export async function validateCoupon(code) {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single()
    
    if (error) throw error
    
    // Check expiry
    if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
      return { success: false, error: 'Coupon expired' }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Validate coupon error:', error.message)
    return { success: false, error: 'Invalid coupon code' }
  }
}

export async function redeemCoupon(couponId, userId, orderId) {
  try {
    const { data, error } = await supabase
      .from('coupon_redemptions')
      .insert({
        coupon_id: couponId,
        user_id: userId,
        order_id: orderId,
        redeemed_at: new Date()
      })
      .select()
    
    if (error) throw error
    return { success: true, data: data[0] }
  } catch (error) {
    console.error('Redeem coupon error:', error.message)
    return { success: false, error: error.message }
  }
}

// User profile functions
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return { success: true, data: data || null }
  } catch (error) {
    console.error('Get user profile error:', error.message)
    return { success: false, error: error.message, data: null }
  }
}

export async function updateUserProfile(userId, updates) {
  try {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (!existing) {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({ user_id: userId, ...updates })
        .select()
      
      if (error) throw error
      return { success: true, data: data[0] }
    } else {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
      
      if (error) throw error
      return { success: true, data: data[0] }
    }
  } catch (error) {
    console.error('Update user profile error:', error.message)
    return { success: false, error: error.message, data: null }
  }
}

// File upload functions
export async function uploadFile(bucket, filePath, file) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Upload file error:', error.message)
    return { success: false, error: error.message }
  }
}

export async function getFileUrl(bucket, filePath) {
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return data?.publicUrl || null
  } catch (error) {
    console.error('Get file URL error:', error.message)
    return null
  }
}

export async function deleteFile(bucket, filePath) {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Delete file error:', error.message)
    return { success: false, error: error.message }
  }
}

// Stock clearance products functions
export async function getStockClearanceCategories() {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: [] }
    }

    // New schema path: categories table managed from Supabase UI
    const categoriesResult = await supabase
      .from('categories')
      .select('name')
      .eq('active', true)
      .in('type', ['Stock Clearance', 'Both'])
      .order('name', { ascending: true })

    if (!categoriesResult.error && Array.isArray(categoriesResult.data) && categoriesResult.data.length > 0) {
      return {
        success: true,
        data: categoriesResult.data
          .map(item => item.name)
          .filter(Boolean)
      }
    }

    const { data, error } = await supabase
      .from('stock_clearance_products')
      .select('category')
      .eq('active', true)
      .neq('category', null)
      .order('category', { ascending: true })

    if (error) throw error
    
    // Remove duplicates
    const categories = [...new Set((data || []).map(item => item.category))].filter(Boolean)
    return { success: true, data: categories }
  } catch (error) {
    console.error('Get stock clearance categories error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getStockClearanceProducts(options = {}) {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, error: 'Supabase is not configured', data: [] }
    }

    const {
      category,
      search,
      minPrice,
      maxPrice,
      sort = 'newest',
      limit = 120,
      offset = 0,
      onlyActive = true
    } = options

    const applyFilters = queryBuilder => {
      let query = queryBuilder.range(offset, offset + limit - 1)

      if (onlyActive) {
        query = query.eq('active', true)
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      if (Number.isFinite(Number(minPrice))) {
        query = query.gte('price', Number(minPrice))
      }

      if (Number.isFinite(Number(maxPrice))) {
        query = query.lte('price', Number(maxPrice))
      }

      const sortConfig = normalizeSort(sort)
      return query.order(sortConfig.column, { ascending: sortConfig.ascending })
    }

    // Legacy schema path: stock_clearance_products.category
    let legacyQuery = applyFilters(
      supabase
        .from('stock_clearance_products')
        .select('*')
    )

    if (category) {
      legacyQuery = legacyQuery.eq('category', category)
    }

    const legacyResult = await legacyQuery
    if (!legacyResult.error) {
      return { success: true, data: legacyResult.data || [] }
    }

    if (!isMissingSchemaError(legacyResult.error)) {
      throw legacyResult.error
    }

    // New schema path: stock_clearance_products.category_id + categories table
    let modernQuery = applyFilters(
      supabase
        .from('stock_clearance_products')
        .select('*, categories:category_id(name)')
    )

    if (category) {
      const categoryIds = await getCategoryIdsByNames([category])
      if (categoryIds.length === 0) {
        return { success: true, data: [] }
      }
      modernQuery = modernQuery.in('category_id', categoryIds)
    }

    const modernResult = await modernQuery
    if (modernResult.error) {
      throw modernResult.error
    }

    const normalized = (modernResult.data || []).map(item => ({
      ...item,
      category: item.category || item.categories?.name || null
    }))

    return { success: true, data: normalized }
  } catch (error) {
    console.error('Get stock clearance products error:', error.message)
    return { success: false, error: error.message, data: [] }
  }
}

// Store settings
export async function getAnnouncementBarMessage() {
  try {
    if (!hasSupabaseConfig || storeSettingsTableUnavailable) {
      return { success: false, data: null }
    }

    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'announcement_bar_text')
      .maybeSingle()

    if (error) {
      if (isMissingSchemaError(error)) {
        storeSettingsTableUnavailable = true
      }
      return { success: false, data: null }
    }

    return { success: true, data: data?.value || null }
  } catch (error) {
    console.error('Get announcement message error:', error.message)
    return { success: false, data: null }
  }
}
