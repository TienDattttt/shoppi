/**
 * Flash Sale Service
 * Business logic for flash sale campaigns
 */

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
const { NotFoundError, ValidationError, ConflictError } = require('../../../shared/utils/error.util');
const { v4: uuidv4 } = require('uuid');

// ============================================
// FLASH SALE CRUD
// ============================================

/**
 * Create a new flash sale campaign
 * @param {object} data - Flash sale data
 * @param {string} createdBy - User ID who created
 * @returns {Promise<object>}
 */
async function createFlashSale(data, createdBy) {
    const { name, description, startTime, endTime, maxProducts, bannerUrl, isFeatured } = data;

    // Validate timing
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start >= end) {
        throw new ValidationError('End time must be after start time');
    }

    // Generate slug
    const slug = generateSlug(name);

    // Determine initial status
    const now = new Date();
    let status = 'draft';
    if (start <= now && end > now) {
        status = 'active';
    } else if (start > now) {
        status = 'scheduled';
    } else if (end <= now) {
        status = 'ended';
    }

    const { data: flashSale, error } = await supabaseAdmin
        .from('flash_sales')
        .insert({
            id: uuidv4(),
            name,
            slug,
            description,
            start_time: startTime,
            end_time: endTime,
            status,
            max_products: maxProducts || 100,
            banner_url: bannerUrl,
            is_featured: isFeatured || false,
            created_by: createdBy,
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new ConflictError('SLUG_EXISTS', 'A flash sale with this name already exists');
        }
        throw new Error(`Failed to create flash sale: ${error.message}`);
    }

    return serializeFlashSale(flashSale);
}

/**
 * Update flash sale
 * @param {string} id - Flash sale ID
 * @param {object} data - Update data
 * @returns {Promise<object>}
 */
async function updateFlashSale(id, data) {
    const existing = await getFlashSaleById(id);
    if (!existing) {
        throw new NotFoundError('Flash sale not found');
    }

    // Can't update ended or cancelled sales
    if (['ended', 'cancelled'].includes(existing.status)) {
        throw new ValidationError('Cannot update ended or cancelled flash sale');
    }

    const updateData = {};
    
    if (data.name) {
        updateData.name = data.name;
        updateData.slug = generateSlug(data.name);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime) updateData.start_time = data.startTime;
    if (data.endTime) updateData.end_time = data.endTime;
    if (data.maxProducts) updateData.max_products = data.maxProducts;
    if (data.bannerUrl !== undefined) updateData.banner_url = data.bannerUrl;
    if (data.isFeatured !== undefined) updateData.is_featured = data.isFeatured;
    if (data.status) updateData.status = data.status;

    const { data: updated, error } = await supabaseAdmin
        .from('flash_sales')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update flash sale: ${error.message}`);
    }

    return serializeFlashSale(updated);
}

/**
 * Delete flash sale
 * @param {string} id - Flash sale ID
 * @returns {Promise<void>}
 */
async function deleteFlashSale(id) {
    const existing = await getFlashSaleById(id);
    if (!existing) {
        throw new NotFoundError('Flash sale not found');
    }

    // Can only delete draft sales
    if (existing.status !== 'draft') {
        throw new ValidationError('Can only delete draft flash sales');
    }

    const { error } = await supabaseAdmin
        .from('flash_sales')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to delete flash sale: ${error.message}`);
    }
}

/**
 * Get flash sale by ID
 * @param {string} id - Flash sale ID
 * @returns {Promise<object|null>}
 */
async function getFlashSaleById(id) {
    const { data, error } = await supabaseAdmin
        .from('flash_sales')
        .select('*')
        .eq('id', id)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to get flash sale: ${error.message}`);
    }

    return data ? serializeFlashSale(data) : null;
}

/**
 * Get flash sale with products
 * @param {string} id - Flash sale ID
 * @returns {Promise<object>}
 */
async function getFlashSaleWithProducts(id) {
    const flashSale = await getFlashSaleById(id);
    if (!flashSale) {
        throw new NotFoundError('Flash sale not found');
    }

    const products = await getFlashSaleProducts(id);
    
    return {
        ...flashSale,
        products,
    };
}

/**
 * List flash sales with filters
 * @param {object} options - Filter options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function listFlashSales(options = {}) {
    const { status, isFeatured, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
        .from('flash_sales')
        .select('*', { count: 'exact' });

    if (status) {
        query = query.eq('status', status);
    }
    if (isFeatured !== undefined) {
        query = query.eq('is_featured', isFeatured);
    }

    query = query
        .order('start_time', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        throw new Error(`Failed to list flash sales: ${error.message}`);
    }

    return {
        data: (data || []).map(serializeFlashSale),
        count: count || 0,
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

/**
 * Get active flash sales (for customer view)
 * @returns {Promise<object[]>}
 */
async function getActiveFlashSales() {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
        .from('flash_sales')
        .select('*')
        .eq('status', 'active')
        .lte('start_time', now)
        .gte('end_time', now)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true });

    if (error) {
        throw new Error(`Failed to get active flash sales: ${error.message}`);
    }

    return (data || []).map(serializeFlashSale);
}

// ============================================
// FLASH SALE PRODUCTS
// ============================================

/**
 * Add product to flash sale
 * @param {string} flashSaleId - Flash sale ID
 * @param {object} data - Product data
 * @returns {Promise<object>}
 */
async function addProductToFlashSale(flashSaleId, data) {
    const { productId, variantId, originalPrice, flashPrice, flashStock, limitPerUser } = data;

    // Validate flash sale exists and is editable
    const flashSale = await getFlashSaleById(flashSaleId);
    if (!flashSale) {
        throw new NotFoundError('Flash sale not found');
    }
    if (['ended', 'cancelled'].includes(flashSale.status)) {
        throw new ValidationError('Cannot add products to ended or cancelled flash sale');
    }

    // Validate pricing
    if (flashPrice >= originalPrice) {
        throw new ValidationError('Flash price must be less than original price');
    }

    const { data: product, error } = await supabaseAdmin
        .from('flash_sale_products')
        .insert({
            id: uuidv4(),
            flash_sale_id: flashSaleId,
            product_id: productId,
            variant_id: variantId || null,
            original_price: originalPrice,
            flash_price: flashPrice,
            flash_stock: flashStock || 0,
            limit_per_user: limitPerUser || 1,
        })
        .select(`
            *,
            products(id, name, slug, base_price)
        `)
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new ConflictError('PRODUCT_EXISTS', 'Product is already in this flash sale');
        }
        throw new Error(`Failed to add product: ${error.message}`);
    }

    return serializeFlashSaleProduct(product);
}

/**
 * Update flash sale product
 * @param {string} flashSaleProductId - Flash sale product ID
 * @param {object} data - Update data
 * @returns {Promise<object>}
 */
async function updateFlashSaleProduct(flashSaleProductId, data) {
    const updateData = {};
    
    if (data.flashPrice !== undefined) updateData.flash_price = data.flashPrice;
    if (data.flashStock !== undefined) updateData.flash_stock = data.flashStock;
    if (data.limitPerUser !== undefined) updateData.limit_per_user = data.limitPerUser;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    const { data: updated, error } = await supabaseAdmin
        .from('flash_sale_products')
        .update(updateData)
        .eq('id', flashSaleProductId)
        .select(`
            *,
            products(id, name, slug, base_price)
        `)
        .single();

    if (error) {
        throw new Error(`Failed to update flash sale product: ${error.message}`);
    }

    return serializeFlashSaleProduct(updated);
}

/**
 * Remove product from flash sale
 * @param {string} flashSaleProductId - Flash sale product ID
 * @returns {Promise<void>}
 */
async function removeProductFromFlashSale(flashSaleProductId) {
    const { error } = await supabaseAdmin
        .from('flash_sale_products')
        .delete()
        .eq('id', flashSaleProductId);

    if (error) {
        throw new Error(`Failed to remove product: ${error.message}`);
    }
}

/**
 * Get products in a flash sale
 * @param {string} flashSaleId - Flash sale ID
 * @returns {Promise<object[]>}
 */
async function getFlashSaleProducts(flashSaleId) {
    const { data, error } = await supabaseAdmin
        .from('flash_sale_products')
        .select(`
            *,
            products(id, name, slug, base_price, short_description, avg_rating, review_count, total_sold)
        `)
        .eq('flash_sale_id', flashSaleId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        throw new Error(`Failed to get flash sale products: ${error.message}`);
    }

    return (data || []).map(serializeFlashSaleProduct);
}

/**
 * Check if user can purchase flash sale product
 * @param {string} flashSaleProductId - Flash sale product ID
 * @param {string} userId - User ID
 * @param {number} quantity - Requested quantity
 * @returns {Promise<{canPurchase: boolean, reason?: string}>}
 */
async function canUserPurchase(flashSaleProductId, userId, quantity = 1) {
    // Get flash sale product
    const { data: fsp, error } = await supabaseAdmin
        .from('flash_sale_products')
        .select(`
            *,
            flash_sales(id, status, start_time, end_time)
        `)
        .eq('id', flashSaleProductId)
        .single();

    if (error || !fsp) {
        return { canPurchase: false, reason: 'Product not found' };
    }

    // Check flash sale is active
    const now = new Date();
    const start = new Date(fsp.flash_sales.start_time);
    const end = new Date(fsp.flash_sales.end_time);
    
    if (fsp.flash_sales.status !== 'active' || now < start || now > end) {
        return { canPurchase: false, reason: 'Flash sale is not active' };
    }

    // Check stock
    const remainingStock = fsp.flash_stock - fsp.sold_count;
    if (remainingStock < quantity) {
        return { canPurchase: false, reason: 'Not enough stock', remainingStock };
    }

    // Check user purchase limit
    const { count } = await supabaseAdmin
        .from('flash_sale_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('flash_sale_product_id', flashSaleProductId)
        .eq('user_id', userId);

    const userPurchased = count || 0;
    if (userPurchased + quantity > fsp.limit_per_user) {
        return { 
            canPurchase: false, 
            reason: 'Purchase limit exceeded',
            limitPerUser: fsp.limit_per_user,
            userPurchased,
        };
    }

    return { canPurchase: true, remainingStock, flashPrice: fsp.flash_price };
}

/**
 * Record flash sale purchase
 * @param {string} flashSaleProductId - Flash sale product ID
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @param {number} quantity - Quantity purchased
 * @returns {Promise<void>}
 */
async function recordPurchase(flashSaleProductId, userId, orderId, quantity = 1) {
    // Insert purchase record
    await supabaseAdmin
        .from('flash_sale_purchases')
        .insert({
            id: uuidv4(),
            flash_sale_id: (await supabaseAdmin
                .from('flash_sale_products')
                .select('flash_sale_id')
                .eq('id', flashSaleProductId)
                .single()).data.flash_sale_id,
            flash_sale_product_id: flashSaleProductId,
            user_id: userId,
            order_id: orderId,
            quantity,
        });

    // Update sold count
    await supabaseAdmin.rpc('increment_flash_sale_sold', {
        p_flash_sale_product_id: flashSaleProductId,
        p_quantity: quantity,
    });
}

// ============================================
// HELPERS
// ============================================

function generateSlug(name) {
    const timestamp = Date.now().toString(36);
    const baseSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return `${baseSlug}-${timestamp}`;
}

function serializeFlashSale(fs) {
    if (!fs) return null;
    return {
        id: fs.id,
        name: fs.name,
        slug: fs.slug,
        description: fs.description,
        startTime: fs.start_time,
        endTime: fs.end_time,
        status: fs.status,
        maxProducts: fs.max_products,
        bannerUrl: fs.banner_url,
        isFeatured: fs.is_featured,
        sortOrder: fs.sort_order,
        createdBy: fs.created_by,
        createdAt: fs.created_at,
        updatedAt: fs.updated_at,
    };
}

function serializeFlashSaleProduct(fsp) {
    if (!fsp) return null;
    return {
        id: fsp.id,
        flashSaleId: fsp.flash_sale_id,
        productId: fsp.product_id,
        variantId: fsp.variant_id,
        originalPrice: parseFloat(fsp.original_price),
        flashPrice: parseFloat(fsp.flash_price),
        discountPercent: fsp.discount_percent,
        flashStock: fsp.flash_stock,
        soldCount: fsp.sold_count,
        remainingStock: fsp.flash_stock - fsp.sold_count,
        limitPerUser: fsp.limit_per_user,
        isActive: fsp.is_active,
        sortOrder: fsp.sort_order,
        product: fsp.products ? {
            id: fsp.products.id,
            name: fsp.products.name,
            slug: fsp.products.slug,
            basePrice: fsp.products.base_price,
            shortDescription: fsp.products.short_description,
            avgRating: fsp.products.avg_rating,
            reviewCount: fsp.products.review_count,
            totalSold: fsp.products.total_sold,
        } : null,
    };
}

module.exports = {
    // Flash Sale CRUD
    createFlashSale,
    updateFlashSale,
    deleteFlashSale,
    getFlashSaleById,
    getFlashSaleWithProducts,
    listFlashSales,
    getActiveFlashSales,
    
    // Flash Sale Products
    addProductToFlashSale,
    updateFlashSaleProduct,
    removeProductFromFlashSale,
    getFlashSaleProducts,
    
    // Purchase validation
    canUserPurchase,
    recordPurchase,
};
