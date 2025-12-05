/**
 * Category Repository
 * Data access layer for category operations
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new category
 * @param {object} categoryData
 * @returns {Promise<object>} Created category
 */
async function createCategory(categoryData) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({
      id: categoryData.id || uuidv4(),
      parent_id: categoryData.parent_id || null,
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description,
      image_url: categoryData.image_url,
      level: categoryData.level || 1,
      path: categoryData.path,
      sort_order: categoryData.sort_order || 0,
      is_active: categoryData.is_active !== false,
      meta_title: categoryData.meta_title,
      meta_description: categoryData.meta_description,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return data;
}

/**
 * Find category by ID
 * @param {string} categoryId
 * @returns {Promise<object|null>}
 */
async function findCategoryById(categoryId) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find category: ${error.message}`);
  }

  return data || null;
}


/**
 * Find category by slug
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function findCategoryBySlug(slug) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find category: ${error.message}`);
  }

  return data || null;
}

/**
 * Find all categories
 * @param {object} options - Filter options
 * @returns {Promise<object[]>}
 */
async function findAllCategories(options = {}) {
  let query = supabaseAdmin
    .from('categories')
    .select('*');

  if (options.is_active !== undefined) {
    query = query.eq('is_active', options.is_active);
  }

  if (options.parent_id !== undefined) {
    if (options.parent_id === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', options.parent_id);
    }
  }

  if (options.level !== undefined) {
    query = query.eq('level', options.level);
  }

  query = query.order('sort_order', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to find categories: ${error.message}`);
  }

  return data || [];
}

/**
 * Find root categories (level 1)
 * @returns {Promise<object[]>}
 */
async function findRootCategories() {
  return findAllCategories({ parent_id: null, is_active: true });
}

/**
 * Find child categories by parent ID
 * @param {string} parentId
 * @returns {Promise<object[]>}
 */
async function findChildCategories(parentId) {
  return findAllCategories({ parent_id: parentId, is_active: true });
}

/**
 * Update category
 * @param {string} categoryId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateCategory(categoryId, updateData) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update category: ${error.message}`);
  }

  return data;
}

/**
 * Delete category (hard delete)
 * @param {string} categoryId
 * @returns {Promise<void>}
 */
async function deleteCategory(categoryId) {
  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`);
  }
}

/**
 * Soft delete category (set is_active to false)
 * @param {string} categoryId
 * @returns {Promise<object>}
 */
async function softDeleteCategory(categoryId) {
  return updateCategory(categoryId, { is_active: false });
}

/**
 * Count products in category
 * @param {string} categoryId
 * @returns {Promise<number>}
 */
async function countProductsInCategory(categoryId) {
  const { count, error } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to count products: ${error.message}`);
  }

  return count || 0;
}

/**
 * Update child categories parent
 * @param {string} oldParentId
 * @param {string|null} newParentId
 * @returns {Promise<object[]>}
 */
async function updateChildCategoriesParent(oldParentId, newParentId) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .update({ parent_id: newParentId })
    .eq('parent_id', oldParentId)
    .select();

  if (error) {
    throw new Error(`Failed to update child categories: ${error.message}`);
  }

  return data || [];
}

/**
 * Check if slug exists
 * @param {string} slug
 * @param {string} excludeId - Category ID to exclude from check
 * @returns {Promise<boolean>}
 */
async function slugExists(slug, excludeId = null) {
  let query = supabaseAdmin
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to check slug: ${error.message}`);
  }

  return count > 0;
}

/**
 * Get category tree (all categories with hierarchy info)
 * @returns {Promise<object[]>}
 */
async function getCategoryTree() {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('level', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to get category tree: ${error.message}`);
  }

  return data || [];
}

/**
 * Get categories by path prefix
 * @param {string} pathPrefix
 * @returns {Promise<object[]>}
 */
async function getCategoriesByPath(pathPrefix) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .like('path', `${pathPrefix}%`)
    .eq('is_active', true)
    .order('path', { ascending: true });

  if (error) {
    throw new Error(`Failed to get categories by path: ${error.message}`);
  }

  return data || [];
}

module.exports = {
  createCategory,
  findCategoryById,
  findCategoryBySlug,
  findAllCategories,
  findRootCategories,
  findChildCategories,
  updateCategory,
  deleteCategory,
  softDeleteCategory,
  countProductsInCategory,
  updateChildCategoriesParent,
  slugExists,
  getCategoryTree,
  getCategoriesByPath,
};
