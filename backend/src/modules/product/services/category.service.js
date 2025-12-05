/**
 * Category Service
 * Business logic for category operations
 */

const categoryRepository = require('../category.repository');
const { AppError, NotFoundError, ValidationError } = require('../../../shared/utils/error.util');

/**
 * Generate slug from name
 * @param {string} name
 * @returns {string}
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/-+/g, '-') // Replace multiple - with single -
    .replace(/^-|-$/g, ''); // Remove leading/trailing -
}

/**
 * Generate unique slug
 * @param {string} name
 * @param {string} excludeId - Category ID to exclude from uniqueness check
 * @returns {Promise<string>}
 */
async function generateUniqueSlug(name, excludeId = null) {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (await categoryRepository.slugExists(slug, excludeId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Calculate level and path for new category
 * @param {string|null} parentId
 * @param {string} slug
 * @returns {Promise<{level: number, path: string}>}
 */
async function calculateLevelAndPath(parentId, slug) {
  if (!parentId) {
    return { level: 1, path: `/${slug}` };
  }

  const parent = await categoryRepository.findCategoryById(parentId);
  if (!parent) {
    throw new NotFoundError('Parent category not found');
  }

  const level = parent.level + 1;
  const path = `${parent.path}/${slug}`;

  return { level, path };
}


/**
 * Create a new category
 * @param {object} data - Category data
 * @returns {Promise<object>} Created category
 */
async function createCategory(data) {
  const { name, parent_id, description, image_url, sort_order, meta_title, meta_description } = data;

  // Validate required fields
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Category name is required');
  }

  if (name.length > 100) {
    throw new ValidationError('Category name must not exceed 100 characters');
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(name);

  // Calculate level and path
  const { level, path } = await calculateLevelAndPath(parent_id, slug);

  // Check depth limit (max 3 levels)
  if (level > 3) {
    throw new AppError('CATEGORY_DEPTH_EXCEEDED', 'Category hierarchy cannot exceed 3 levels', 400);
  }

  // Create category
  const category = await categoryRepository.createCategory({
    name: name.trim(),
    slug,
    parent_id: parent_id || null,
    description,
    image_url,
    level,
    path,
    sort_order: sort_order || 0,
    meta_title,
    meta_description,
  });

  return category;
}

/**
 * Get category by ID
 * @param {string} categoryId
 * @returns {Promise<object>}
 */
async function getCategoryById(categoryId) {
  const category = await categoryRepository.findCategoryById(categoryId);
  
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  return category;
}

/**
 * Get category by slug
 * @param {string} slug
 * @returns {Promise<object>}
 */
async function getCategoryBySlug(slug) {
  const category = await categoryRepository.findCategoryBySlug(slug);
  
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  return category;
}

/**
 * Update category
 * @param {string} categoryId
 * @param {object} data - Update data
 * @returns {Promise<object>}
 */
async function updateCategory(categoryId, data) {
  const category = await getCategoryById(categoryId);

  const updateData = {};

  // Update name and regenerate slug if name changed
  if (data.name && data.name !== category.name) {
    if (data.name.length > 100) {
      throw new ValidationError('Category name must not exceed 100 characters');
    }
    updateData.name = data.name.trim();
    updateData.slug = await generateUniqueSlug(data.name, categoryId);
    
    // Update path with new slug
    const pathParts = category.path.split('/');
    pathParts[pathParts.length - 1] = updateData.slug;
    updateData.path = pathParts.join('/');
  }

  // Update other fields
  if (data.description !== undefined) updateData.description = data.description;
  if (data.image_url !== undefined) updateData.image_url = data.image_url;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (data.meta_title !== undefined) updateData.meta_title = data.meta_title;
  if (data.meta_description !== undefined) updateData.meta_description = data.meta_description;

  // Handle parent change
  if (data.parent_id !== undefined && data.parent_id !== category.parent_id) {
    const slug = updateData.slug || category.slug;
    const { level, path } = await calculateLevelAndPath(data.parent_id, slug);
    
    if (level > 3) {
      throw new AppError('CATEGORY_DEPTH_EXCEEDED', 'Category hierarchy cannot exceed 3 levels', 400);
    }

    updateData.parent_id = data.parent_id;
    updateData.level = level;
    updateData.path = path;
  }

  if (Object.keys(updateData).length === 0) {
    return category;
  }

  return categoryRepository.updateCategory(categoryId, updateData);
}

/**
 * Delete category
 * @param {string} categoryId
 * @returns {Promise<void>}
 */
async function deleteCategory(categoryId) {
  const category = await getCategoryById(categoryId);

  // Check if category has products
  const productCount = await categoryRepository.countProductsInCategory(categoryId);
  if (productCount > 0) {
    throw new AppError(
      'CATEGORY_HAS_PRODUCTS',
      `Cannot delete category with ${productCount} products. Please reassign products first.`,
      400
    );
  }

  // Reassign child categories to parent
  await categoryRepository.updateChildCategoriesParent(categoryId, category.parent_id);

  // Delete category
  await categoryRepository.deleteCategory(categoryId);
}

/**
 * Get category tree (hierarchical structure)
 * @returns {Promise<object[]>}
 */
async function getCategoryTree() {
  const categories = await categoryRepository.getCategoryTree();
  
  // Build tree structure
  const categoryMap = new Map();
  const rootCategories = [];

  // First pass: create map
  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree
  categories.forEach(cat => {
    const node = categoryMap.get(cat.id);
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id).children.push(node);
    } else if (!cat.parent_id) {
      rootCategories.push(node);
    }
  });

  return rootCategories;
}

/**
 * Get all categories (flat list)
 * @param {object} options - Filter options
 * @returns {Promise<object[]>}
 */
async function getAllCategories(options = {}) {
  return categoryRepository.findAllCategories(options);
}

/**
 * Get child categories
 * @param {string} parentId
 * @returns {Promise<object[]>}
 */
async function getChildCategories(parentId) {
  return categoryRepository.findChildCategories(parentId);
}

/**
 * Get category breadcrumb (path from root to category)
 * @param {string} categoryId
 * @returns {Promise<object[]>}
 */
async function getCategoryBreadcrumb(categoryId) {
  const category = await getCategoryById(categoryId);
  
  // Get all categories in path
  const pathSlugs = category.path.split('/').filter(Boolean);
  const breadcrumb = [];

  for (const slug of pathSlugs) {
    const cat = await categoryRepository.findCategoryBySlug(slug);
    if (cat) {
      breadcrumb.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      });
    }
  }

  return breadcrumb;
}

module.exports = {
  generateSlug,
  generateUniqueSlug,
  createCategory,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  getAllCategories,
  getChildCategories,
  getCategoryBreadcrumb,
};
