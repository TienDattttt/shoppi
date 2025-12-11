/**
 * Cart Repository
 * Database operations for carts and cart_items
 */

const { supabaseAdmin: supabase } = require('../../shared/supabase/supabase.client');

/**
 * Find cart by user ID
 */
async function findCartByUserId(userId) {
  const { data, error } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Create cart for user
 */
async function createCart(userId) {
  const { data, error } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Find cart items with product info
 */
async function findCartItemsWithProducts(cartId) {
  // First get cart items
  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!cartItems || cartItems.length === 0) return [];
  
  // Get unique product and variant IDs
  const productIds = [...new Set(cartItems.map(item => item.product_id))];
  const variantIds = [...new Set(cartItems.map(item => item.variant_id))];
  
  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, shop_id')
    .in('id', productIds);
  
  const productMap = {};
  for (const p of products || []) {
    productMap[p.id] = p;
  }
  
  // Fetch variants
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, name, sku, price, compare_at_price, quantity, image_url, attributes')
    .in('id', variantIds);
  
  const variantMap = {};
  for (const v of variants || []) {
    variantMap[v.id] = v;
  }
  
  // Fetch product images
  const { data: images } = await supabase
    .from('product_images')
    .select('product_id, url')
    .in('product_id', productIds)
    .eq('is_primary', true);
  
  const imageMap = {};
  for (const img of images || []) {
    imageMap[img.product_id] = img.url;
  }
  
  // Combine data
  const result = cartItems.map(item => {
    const product = productMap[item.product_id];
    const variant = variantMap[item.variant_id];
    
    return {
      ...item,
      products: product ? {
        ...product,
        thumbnail_url: imageMap[item.product_id] || null,
      } : null,
      product_variants: variant || null,
    };
  });
  
  return result;
}


/**
 * Find cart item by ID
 */
async function findCartItemById(itemId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('id', itemId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Find cart item by cart and variant
 */
async function findCartItem(cartId, variantId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cartId)
    .eq('variant_id', variantId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Create cart item
 */
async function createCartItem(itemData) {
  const { data, error } = await supabase
    .from('cart_items')
    .insert({
      cart_id: itemData.cartId,
      product_id: itemData.productId,
      variant_id: itemData.variantId,
      quantity: itemData.quantity,
    })
    .select('*')
    .single();
  
  if (error) throw error;
  
  // Fetch product and variant separately
  const { data: product } = await supabase
    .from('products')
    .select('id, name, slug, shop_id')
    .eq('id', data.product_id)
    .single();
  
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, name, sku, price, compare_at_price, quantity, image_url, attributes')
    .eq('id', data.variant_id)
    .single();
  
  const { data: imgData } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', data.product_id)
    .eq('is_primary', true)
    .single();
  
  return {
    ...data,
    products: product ? { ...product, thumbnail_url: imgData?.url || null } : null,
    product_variants: variant || null,
  };
}

/**
 * Update cart item
 */
async function updateCartItem(itemId, updateData) {
  const { data, error } = await supabase
    .from('cart_items')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select('*')
    .single();
  
  if (error) throw error;
  
  // Fetch product and variant separately
  const { data: product } = await supabase
    .from('products')
    .select('id, name, slug, shop_id')
    .eq('id', data.product_id)
    .single();
  
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, name, sku, price, compare_at_price, quantity, image_url, attributes')
    .eq('id', data.variant_id)
    .single();
  
  const { data: imgData } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', data.product_id)
    .eq('is_primary', true)
    .single();
  
  return {
    ...data,
    products: product ? { ...product, thumbnail_url: imgData?.url || null } : null,
    product_variants: variant || null,
  };
}

/**
 * Delete cart item
 */
async function deleteCartItem(itemId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId);
  
  if (error) throw error;
}

/**
 * Clear all items from cart
 */
async function clearCart(cartId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId);
  
  if (error) throw error;
}

/**
 * Get variant with stock info
 */
async function getVariantWithStock(variantId) {
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, product_id, sku, name, price, quantity, reserved_quantity, image_url, is_active')
    .eq('id', variantId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  
  // Map quantity to stock_quantity for compatibility
  if (data) {
    data.stock_quantity = (data.quantity || 0) - (data.reserved_quantity || 0);
  }
  
  return data;
}

/**
 * Find cart items by IDs
 */
async function findCartItemsByIds(itemIds, userId) {
  // First get user's cart
  const cart = await findCartByUserId(userId);
  if (!cart) return [];
  
  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id)
    .in('id', itemIds);
  
  if (error) throw error;
  if (!cartItems || cartItems.length === 0) return [];
  
  // Get unique product and variant IDs
  const productIds = [...new Set(cartItems.map(item => item.product_id))];
  const variantIds = [...new Set(cartItems.map(item => item.variant_id))];
  
  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, shop_id')
    .in('id', productIds);
  
  const productMap = {};
  for (const p of products || []) {
    productMap[p.id] = p;
  }
  
  // Fetch variants
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, name, sku, price, compare_at_price, quantity, image_url, weight, attributes')
    .in('id', variantIds);
  
  const variantMap = {};
  for (const v of variants || []) {
    variantMap[v.id] = v;
  }
  
  // Fetch product images
  const { data: images } = await supabase
    .from('product_images')
    .select('product_id, url')
    .in('product_id', productIds)
    .eq('is_primary', true);
  
  const imageMap = {};
  for (const img of images || []) {
    imageMap[img.product_id] = img.url;
  }
  
  // Combine data
  return cartItems.map(item => {
    const product = productMap[item.product_id];
    const variant = variantMap[item.variant_id];
    
    return {
      ...item,
      products: product ? { ...product, thumbnail_url: imageMap[item.product_id] || null } : null,
      product_variants: variant || null,
    };
  });
}

/**
 * Remove multiple cart items
 */
async function removeCartItems(itemIds) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .in('id', itemIds);
  
  if (error) throw error;
}

module.exports = {
  findCartByUserId,
  createCart,
  findCartItemsWithProducts,
  findCartItemById,
  findCartItem,
  createCartItem,
  updateCartItem,
  deleteCartItem,
  clearCart,
  getVariantWithStock,
  findCartItemsByIds,
  removeCartItems,
};
