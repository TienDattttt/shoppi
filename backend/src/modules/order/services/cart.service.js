/**
 * Cart Service
 * Business logic for shopping cart operations
 */

const cartRepository = require('../cart.repository');
const orderDTO = require('../order.dto');
const { AppError } = require('../../../shared/utils/error.util');
const { supabaseAdmin: supabase } = require('../../../shared/supabase/supabase.client');

/**
 * Get user's cart with items grouped by shop
 */
async function getCart(userId) {
  try {
    console.log('[CartService] getCart called for userId:', userId);
    
    let cart = await cartRepository.findCartByUserId(userId);
    console.log('[CartService] Found cart:', cart ? cart.id : 'none');
    
    // Create cart if not exists
    if (!cart) {
      console.log('[CartService] Creating new cart for user');
      cart = await cartRepository.createCart(userId);
      console.log('[CartService] Created cart:', cart?.id);
    }
    
    // Get cart items with product info
    const items = await cartRepository.findCartItemsWithProducts(cart.id);
    console.log('[CartService] Found items:', items?.length || 0);
    
    // Group items by shop (async to fetch shop names)
    const groupedByShop = await groupItemsByShop(items);
    console.log('[CartService] Grouped by shop:', groupedByShop?.length || 0);
    
    const serializedCart = orderDTO.serializeCart(cart);
    console.log('[CartService] Serialized cart:', serializedCart?.id);
    
    return {
      ...serializedCart,
      itemsByShop: groupedByShop,
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  } catch (error) {
    console.error('[CartService] getCart error:', error);
    throw error;
  }
}

/**
 * Group cart items by shop
 */
async function groupItemsByShop(items) {
  const grouped = {};
  const shopIds = new Set();
  
  for (const item of items) {
    const shopId = item.products?.shop_id || 'unknown';
    shopIds.add(shopId);
    
    if (!grouped[shopId]) {
      grouped[shopId] = {
        shopId,
        shopName: null,
        items: [],
        subtotal: 0,
      };
    }
    
    const serializedItem = orderDTO.serializeCartItem(item);
    grouped[shopId].items.push(serializedItem);
    
    // Calculate subtotal - use price (no sale_price column exists)
    const price = item.product_variants?.price || 0;
    grouped[shopId].subtotal += parseFloat(price) * item.quantity;
  }
  
  // Fetch shop names - filter out 'unknown' and invalid UUIDs
  const validShopIds = Array.from(shopIds).filter(id => 
    id && id !== 'unknown' && id.length === 36
  );
  
  if (validShopIds.length > 0) {
    const { data: shops } = await supabase
      .from('shops')
      .select('id, shop_name')
      .in('id', validShopIds);
    
    if (shops) {
      for (const shop of shops) {
        if (grouped[shop.id]) {
          grouped[shop.id].shopName = shop.shop_name;
        }
      }
    }
  }
  
  return Object.values(grouped);
}


/**
 * Add item to cart
 */
async function addItem(userId, itemData) {
  const { productId, variantId, quantity } = itemData;
  
  // Get or create cart
  let cart = await cartRepository.findCartByUserId(userId);
  if (!cart) {
    cart = await cartRepository.createCart(userId);
  }
  
  // Check if variant exists and has stock
  const variant = await cartRepository.getVariantWithStock(variantId);
  
  if (!variant) {
    throw new AppError('PRODUCT_NOT_FOUND', 'Product variant not found', 404);
  }
  
  if (variant.stock_quantity < quantity) {
    throw new AppError('INSUFFICIENT_STOCK', 
      `Only ${variant.stock_quantity} items available`, 400);
  }
  
  // Check if item already in cart
  const existingItem = await cartRepository.findCartItem(cart.id, variantId);
  
  if (existingItem) {
    // Update quantity
    const newQuantity = existingItem.quantity + quantity;
    
    if (variant.stock_quantity < newQuantity) {
      throw new AppError('INSUFFICIENT_STOCK', 
        `Only ${variant.stock_quantity} items available`, 400);
    }
    
    return updateItem(userId, existingItem.id, newQuantity);
  }
  
  // Add new item
  const cartItem = await cartRepository.createCartItem({
    cartId: cart.id,
    productId,
    variantId,
    quantity,
  });
  
  return orderDTO.serializeCartItem(cartItem);
}

/**
 * Update cart item quantity
 */
async function updateItem(userId, itemId, quantity) {
  const cart = await cartRepository.findCartByUserId(userId);
  
  if (!cart) {
    throw new AppError('CART_NOT_FOUND', 'Cart not found', 404);
  }
  
  const cartItem = await cartRepository.findCartItemById(itemId);
  
  if (!cartItem || cartItem.cart_id !== cart.id) {
    throw new AppError('CART_ITEM_NOT_FOUND', 'Cart item not found', 404);
  }
  
  // Check stock
  const variant = await cartRepository.getVariantWithStock(cartItem.variant_id);
  
  if (!variant) {
    throw new AppError('PRODUCT_NOT_FOUND', 'Product variant not found', 404);
  }
  
  if (variant.stock_quantity < quantity) {
    throw new AppError('INSUFFICIENT_STOCK', 
      `Only ${variant.stock_quantity} items available`, 400);
  }
  
  const updatedItem = await cartRepository.updateCartItem(itemId, { quantity });
  
  return orderDTO.serializeCartItem(updatedItem);
}

/**
 * Remove item from cart
 */
async function removeItem(userId, itemId) {
  const cart = await cartRepository.findCartByUserId(userId);
  
  if (!cart) {
    throw new AppError('CART_NOT_FOUND', 'Cart not found', 404);
  }
  
  const cartItem = await cartRepository.findCartItemById(itemId);
  
  if (!cartItem || cartItem.cart_id !== cart.id) {
    throw new AppError('CART_ITEM_NOT_FOUND', 'Cart item not found', 404);
  }
  
  await cartRepository.deleteCartItem(itemId);
}

/**
 * Clear cart
 */
async function clearCart(userId) {
  const cart = await cartRepository.findCartByUserId(userId);
  
  if (cart) {
    await cartRepository.clearCart(cart.id);
  }
}

/**
 * Validate cart items availability
 */
async function validateCartItems(userId) {
  const cart = await cartRepository.findCartByUserId(userId);
  
  if (!cart) {
    return { isValid: true, unavailableItems: [] };
  }
  
  const items = await cartRepository.findCartItemsWithProducts(cart.id);
  const unavailableItems = [];
  
  for (const item of items) {
    const variant = item.product_variants;
    
    if (!variant || variant.stock_quantity < item.quantity) {
      unavailableItems.push({
        itemId: item.id,
        productName: item.products?.name,
        variantName: variant?.name,
        requestedQuantity: item.quantity,
        availableQuantity: variant?.stock_quantity || 0,
      });
      
      // Mark as unavailable
      await cartRepository.updateCartItem(item.id, { is_available: false });
    }
  }
  
  return {
    isValid: unavailableItems.length === 0,
    unavailableItems,
  };
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  validateCartItems,
  groupItemsByShop,
};
