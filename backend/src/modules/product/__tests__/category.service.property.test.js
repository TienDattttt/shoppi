/**
 * Property-Based Tests for Category Service
 * Tests category operations correctness
 */

const fc = require('fast-check');

// Mock supabase client before importing modules that use it
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })),
      select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn() })) })),
    })),
  },
}));

// Mock the repository
jest.mock('../category.repository');

const categoryService = require('../services/category.service');
const categoryRepository = require('../category.repository');

// Arbitrary generators for category data
// Only generate names that will produce valid slugs (contain at least one alphanumeric char)
const categoryNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0 && /[a-zA-Z0-9]/.test(s));

const categoryArb = fc.record({
  id: fc.uuid(),
  name: categoryNameArb,
  slug: fc.string({ minLength: 1, maxLength: 120 }),
  parent_id: fc.option(fc.uuid(), { nil: null }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  level: fc.integer({ min: 1, max: 3 }),
  path: fc.string({ minLength: 1, maxLength: 500 }),
  is_active: fc.boolean(),
  sort_order: fc.integer({ min: 0, max: 1000 }),
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString()),
});

// Generator for Vietnamese names with diacritics
const vietnameseNameArb = fc.constantFrom(
  'Điện thoại',
  'Máy tính',
  'Thời trang',
  'Đồ gia dụng',
  'Sách và Văn phòng phẩm',
  'Mỹ phẩm',
  'Đồ chơi',
  'Thể thao',
  'Ô tô xe máy',
  'Nhà cửa đời sống'
);

describe('Category Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  /**
   * **Feature: product-management, Property 1: Category slug uniqueness**
   * **Validates: Requirements 1.1**
   * 
   * For any category name, the generated slug SHALL be unique across all categories in the system.
   */
  describe('Property 1: Category slug uniqueness', () => {
    it('should generate unique slugs for any category name', () => {
      fc.assert(
        fc.property(categoryNameArb, (name) => {
          // Test slug generation
          const slug = categoryService.generateSlug(name);
          
          // Slug should be non-empty
          expect(slug.length).toBeGreaterThan(0);
          
          // Slug should only contain valid characters
          expect(slug).toMatch(/^[a-z0-9-]+$/);
          
          // Slug should not start or end with hyphen
          expect(slug).not.toMatch(/^-|-$/);
          
          // Slug should not have consecutive hyphens
          expect(slug).not.toMatch(/--/);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate unique slugs when duplicates exist', async () => {
      await fc.assert(
        fc.asyncProperty(categoryNameArb, async (name) => {
          const baseSlug = categoryService.generateSlug(name);
          
          // Mock: first slug exists, second doesn't
          categoryRepository.slugExists
            .mockResolvedValueOnce(true)  // baseSlug exists
            .mockResolvedValueOnce(false); // baseSlug-1 doesn't exist
          
          const uniqueSlug = await categoryService.generateUniqueSlug(name);
          
          // Should append counter when base slug exists
          expect(uniqueSlug).toBe(`${baseSlug}-1`);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle Vietnamese names with diacritics', () => {
      fc.assert(
        fc.property(vietnameseNameArb, (name) => {
          const slug = categoryService.generateSlug(name);
          
          // Slug should be ASCII only
          expect(slug).toMatch(/^[a-z0-9-]+$/);
          
          // Slug should be non-empty
          expect(slug.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should create category with unique slug', async () => {
      await fc.assert(
        fc.asyncProperty(categoryNameArb, async (name) => {
          const expectedSlug = categoryService.generateSlug(name);
          
          // Mock repository
          categoryRepository.slugExists.mockResolvedValue(false);
          categoryRepository.createCategory.mockImplementation(async (data) => ({
            id: 'test-id',
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          
          const category = await categoryService.createCategory({ name });
          
          // Category should have a valid slug
          expect(category.slug).toBe(expectedSlug);
          expect(category.slug).toMatch(/^[a-z0-9-]+$/);
        }),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: product-management, Property 2: Category depth limit enforcement**
   * **Validates: Requirements 1.5**
   * 
   * For any category creation attempt, if the resulting hierarchy would exceed 3 levels,
   * the creation SHALL be rejected.
   */
  describe('Property 2: Category depth limit enforcement', () => {
    it('should allow categories up to level 3', async () => {
      await fc.assert(
        fc.asyncProperty(
          categoryNameArb,
          fc.integer({ min: 1, max: 3 }),
          async (name, parentLevel) => {
            const parentId = 'parent-id';
            const parentCategory = {
              id: parentId,
              name: 'Parent',
              slug: 'parent',
              level: parentLevel,
              path: '/parent'.repeat(parentLevel),
            };
            
            // Mock repository
            categoryRepository.slugExists.mockResolvedValue(false);
            categoryRepository.findCategoryById.mockResolvedValue(parentCategory);
            categoryRepository.createCategory.mockImplementation(async (data) => ({
              id: 'new-id',
              ...data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
            
            if (parentLevel < 3) {
              // Should succeed for levels 1-2 parents
              const category = await categoryService.createCategory({
                name,
                parent_id: parentId,
              });
              
              expect(category.level).toBe(parentLevel + 1);
              expect(category.level).toBeLessThanOrEqual(3);
            } else {
              // Should fail for level 3 parent (would create level 4)
              await expect(
                categoryService.createCategory({ name, parent_id: parentId })
              ).rejects.toThrow('Category hierarchy cannot exceed 3 levels');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject category creation that would exceed depth limit', async () => {
      await fc.assert(
        fc.asyncProperty(categoryNameArb, async (name) => {
          const level3Parent = {
            id: 'level3-parent',
            name: 'Level 3 Parent',
            slug: 'level3-parent',
            level: 3,
            path: '/root/child/grandchild',
          };
          
          categoryRepository.slugExists.mockResolvedValue(false);
          categoryRepository.findCategoryById.mockResolvedValue(level3Parent);
          
          // Attempting to create child of level 3 category should fail
          await expect(
            categoryService.createCategory({ name, parent_id: level3Parent.id })
          ).rejects.toThrow('Category hierarchy cannot exceed 3 levels');
        }),
        { numRuns: 100 }
      );
    });

    it('should allow root categories (level 1)', async () => {
      await fc.assert(
        fc.asyncProperty(categoryNameArb, async (name) => {
          categoryRepository.slugExists.mockResolvedValue(false);
          categoryRepository.createCategory.mockImplementation(async (data) => ({
            id: 'new-id',
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          
          // Creating without parent should create level 1 category
          const category = await categoryService.createCategory({ name });
          
          expect(category.level).toBe(1);
          expect(category.parent_id).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject update that would exceed depth limit', async () => {
      await fc.assert(
        fc.asyncProperty(categoryNameArb, async (name) => {
          const existingCategory = {
            id: 'existing-id',
            name,
            slug: categoryService.generateSlug(name),
            level: 1,
            path: `/${categoryService.generateSlug(name)}`,
            parent_id: null,
          };
          
          const level3Parent = {
            id: 'level3-parent',
            name: 'Level 3 Parent',
            slug: 'level3-parent',
            level: 3,
            path: '/root/child/grandchild',
          };
          
          categoryRepository.findCategoryById
            .mockResolvedValueOnce(existingCategory)
            .mockResolvedValueOnce(level3Parent);
          
          // Attempting to move category under level 3 parent should fail
          await expect(
            categoryService.updateCategory(existingCategory.id, { parent_id: level3Parent.id })
          ).rejects.toThrow('Category hierarchy cannot exceed 3 levels');
        }),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: product-management, Property 3: Category deletion with products rejection**
   * **Validates: Requirements 1.4**
   * 
   * For any category containing products, deletion attempts SHALL be rejected with appropriate error.
   */
  describe('Property 3: Category deletion with products rejection', () => {
    it('should reject deletion of category with products', async () => {
      await fc.assert(
        fc.asyncProperty(
          categoryArb,
          fc.integer({ min: 1, max: 1000 }),
          async (category, productCount) => {
            categoryRepository.findCategoryById.mockResolvedValue(category);
            categoryRepository.countProductsInCategory.mockResolvedValue(productCount);
            
            // Should reject deletion when products exist
            await expect(
              categoryService.deleteCategory(category.id)
            ).rejects.toThrow(`Cannot delete category with ${productCount} products`);
            
            // Delete should not be called
            expect(categoryRepository.deleteCategory).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow deletion of category without products', async () => {
      await fc.assert(
        fc.asyncProperty(categoryArb, async (category) => {
          categoryRepository.findCategoryById.mockResolvedValue(category);
          categoryRepository.countProductsInCategory.mockResolvedValue(0);
          categoryRepository.updateChildCategoriesParent.mockResolvedValue([]);
          categoryRepository.deleteCategory.mockResolvedValue();
          
          // Should succeed when no products
          await categoryService.deleteCategory(category.id);
          
          // Delete should be called
          expect(categoryRepository.deleteCategory).toHaveBeenCalledWith(category.id);
        }),
        { numRuns: 100 }
      );
    });

    it('should reassign child categories to parent on deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          categoryArb,
          fc.array(categoryArb, { minLength: 1, maxLength: 5 }),
          async (parentCategory, childCategories) => {
            categoryRepository.findCategoryById.mockResolvedValue(parentCategory);
            categoryRepository.countProductsInCategory.mockResolvedValue(0);
            categoryRepository.updateChildCategoriesParent.mockResolvedValue(childCategories);
            categoryRepository.deleteCategory.mockResolvedValue();
            
            await categoryService.deleteCategory(parentCategory.id);
            
            // Should reassign children to grandparent
            expect(categoryRepository.updateChildCategoriesParent).toHaveBeenCalledWith(
              parentCategory.id,
              parentCategory.parent_id
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw NotFoundError for non-existent category', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (categoryId) => {
          categoryRepository.findCategoryById.mockResolvedValue(null);
          
          await expect(
            categoryService.deleteCategory(categoryId)
          ).rejects.toThrow('Category not found');
        }),
        { numRuns: 100 }
      );
    });
  });
});
