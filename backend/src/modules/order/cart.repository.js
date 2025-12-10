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
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      products (
        id,
        name,
        slug,
        shop_id,
        thumbnail_url
      ),
      product_variants (
        id,
        name,
        sku,
        price,
        sale_price,
        stock_quantity,
        image_url
      )
    `)
    .eq('cart_id', cartId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
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
    .select(`
      *,
      products (id, name, slug, shop_id, thumbnail_url),
      product_variants (id, name, sku, price, sale_price, stock_quantity, image_url)
    `)
    .single();
  
  if (error) throw error;
  return data;
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
    .select(`
      *,
      products (id, name, slug, shop_id, thumbnail_url),
      product_variants (id, name, sku, price, sale_price, stock_quantity, image_url)
    `)
    .single();
  
  if (error) throw error;
  return data;
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
    .select('*')
    .eq('id', variantId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Find cart items by IDs
 */
async function findCartItemsByIds(itemIds, userId) {
  // First get user's cart
  const cart = await findCartByUserId(userId);
  if (!cart) return [];
  
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      products (id, name, slug, shop_id, thumbnail_url),
      product_variants (id, name, sku, price, sale_price, stock_quantity, image_url, weight)
    `)
    .eq('cart_id', cart.id)
    .in('id', itemIds);
  
  if (error) throw error;
  return data || [];
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
