import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

const fallbackSupabaseUrl = 'https://placeholder.supabase.co'
const fallbackSupabaseAnonKey = 'placeholder-anon-key'

if (!hasSupabaseConfig) {
  console.error('Missing Supabase credentials. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file')
}

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : fallbackSupabaseUrl,
  hasSupabaseConfig ? supabaseAnonKey : fallbackSupabaseAnonKey
)

// Authentication functions
export async function signUp(email, password, userData) {
  try {
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

// Store settings
export async function getAnnouncementBarMessage() {
  try {
    if (!hasSupabaseConfig) {
      return { success: false, data: null }
    }

    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'announcement_bar_text')
      .maybeSingle()

    if (error) {
      return { success: false, data: null }
    }

    return { success: true, data: data?.value || null }
  } catch (error) {
    console.error('Get announcement message error:', error.message)
    return { success: false, data: null }
  }
}
