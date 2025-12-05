/**
 * Property-Based Tests for Auth Service - Registration
 * Tests registration correctness properties
 */

const fc = require('fast-check');

// Mock dependencies
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');

// Generators
const emailArb = fc.emailAddress();
const phoneArb = fc.stringMatching(/^0[0-9]{9}$/);
const passwordArb = fc.string({ minLength: 8, maxLength: 20 })
  .filter(p => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p));
const fullNameArb = fc.string({ minLength: 1, maxLength: 100 });
const businessNameArb = fc.string({ minLength: 1, maxLength: 100 });
const taxIdArb = fc.stringMatching(/^[0-9]{10,13}$/);
const idCardArb = fc.stringMatching(/^[0-9]{9,12}$/);
const vehicleTypeArb = fc.constantFrom('motorcycle', 'car', 'bicycle', 'truck');
const vehiclePlateArb = fc.stringMatching(/^[A-Z0-9]{5,10}$/);

describe('Auth Service Registration Property Tests', () => {
  let authService;
  let mockUserStore;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserStore = new Map();
    
    // Reset module cache to get fresh instance
    jest.resetModules();
    
    // Setup mock behavior
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          ...mockChain,
          insert: jest.fn((data) => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              const user = { ...data, id: 'test-uuid', created_at: new Date().toISOString() };
              mockUserStore.set(data.email || data.phone, user);
              return { data: user, error: null };
            }),
          })),
          select: jest.fn(() => ({
            eq: jest.fn((field, value) => ({
              single: jest.fn().mockImplementation(async () => {
                // Check if user exists
                for (const [key, user] of mockUserStore) {
                  if (user[field] === value) {
                    return { data: user, error: null };
                  }
                }
                return { data: null, error: { code: 'PGRST116' } };
              }),
            })),
          })),
        };
      }
      if (table === 'otps') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { id: 'otp-uuid', otp_code: '123456' }, 
              error: null 
            }),
          })),
        };
      }
      return mockChain;
    });

    authService = require('../auth.service');
  });

  /**
   * **Feature: user-authentication, Property 1: Registration creates account with correct status**
   * **Validates: Requirements 1.1, 1.2, 2.1, 3.1**
   * 
   * For any valid registration data, submitting registration SHALL create
   * a new user record with the appropriate initial status.
   */
  describe('Property 1: Registration creates account with correct status', () => {
    it('Customer registration creates account with pending status', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          fullNameArb,
          async (email, password, fullName) => {
            mockUserStore.clear();
            
            const result = await authService.registerCustomer({
              email,
              password,
              fullName,
            });

            // Should return user object
            expect(result.user).toBeDefined();
            expect(result.user.role).toBe('customer');
            expect(result.user.status).toBe('pending');
            expect(result.user.email).toBe(email.toLowerCase());
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Partner registration creates account with pending status', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          phoneArb,
          passwordArb,
          fullNameArb,
          businessNameArb,
          taxIdArb,
          async (email, phone, password, fullName, businessName, taxId) => {
            mockUserStore.clear();
            
            const result = await authService.registerPartner({
              email,
              phone,
              password,
              fullName,
              businessName,
              taxId,
            });

            expect(result.user).toBeDefined();
            expect(result.user.role).toBe('partner');
            expect(result.user.status).toBe('pending');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Shipper registration creates account with pending status', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArb,
          passwordArb,
          fullNameArb,
          idCardArb,
          vehicleTypeArb,
          vehiclePlateArb,
          async (phone, password, fullName, idCardNumber, vehicleType, vehiclePlate) => {
            mockUserStore.clear();
            
            const result = await authService.registerShipper({
              phone,
              password,
              fullName,
              idCardNumber,
              vehicleType,
              vehiclePlate,
            });

            expect(result.user).toBeDefined();
            expect(result.user.role).toBe('shipper');
            expect(result.user.status).toBe('pending');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Feature: user-authentication, Property 2: Duplicate registration rejection**
   * **Validates: Requirements 1.3**
   * 
   * For any existing user identifier (email or phone), attempting to register
   * a new account with the same identifier SHALL be rejected.
   */
  describe('Property 2: Duplicate registration rejection', () => {
    it('should reject registration with duplicate email', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          fullNameArb,
          async (email, password, fullName) => {
            mockUserStore.clear();
            
            // First registration should succeed
            await authService.registerCustomer({ email, password, fullName });

            // Second registration with same email should fail
            await expect(
              authService.registerCustomer({ email, password, fullName: 'Another Name' })
            ).rejects.toThrow('AUTH_DUPLICATE_EMAIL');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject registration with duplicate phone', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArb,
          passwordArb,
          fullNameArb,
          async (phone, password, fullName) => {
            mockUserStore.clear();
            
            // First registration
            await authService.registerCustomer({ phone, password, fullName });

            // Second registration with same phone should fail
            await expect(
              authService.registerCustomer({ phone, password, fullName: 'Another Name' })
            ).rejects.toThrow('AUTH_DUPLICATE_PHONE');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Feature: user-authentication, Property 5: Pending accounts require approval before activation**
   * **Validates: Requirements 2.2, 3.2**
   * 
   * For any Partner or Shipper account, the status SHALL remain 'pending'
   * until an Admin explicitly approves the account.
   */
  describe('Property 5: Pending accounts require approval before activation', () => {
    it('Partner accounts are created with pending status requiring approval', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          phoneArb,
          passwordArb,
          fullNameArb,
          businessNameArb,
          taxIdArb,
          async (email, phone, password, fullName, businessName, taxId) => {
            mockUserStore.clear();
            
            const result = await authService.registerPartner({
              email,
              phone,
              password,
              fullName,
              businessName,
              taxId,
            });

            // Partner should always be pending after registration
            expect(result.user.status).toBe('pending');
            // Message should indicate waiting for approval
            expect(result.message).toContain('admin approval');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Shipper accounts are created with pending status requiring approval', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArb,
          passwordArb,
          fullNameArb,
          idCardArb,
          vehicleTypeArb,
          vehiclePlateArb,
          async (phone, password, fullName, idCardNumber, vehicleType, vehiclePlate) => {
            mockUserStore.clear();
            
            const result = await authService.registerShipper({
              phone,
              password,
              fullName,
              idCardNumber,
              vehicleType,
              vehiclePlate,
            });

            // Shipper should always be pending after registration
            expect(result.user.status).toBe('pending');
            // Message should indicate waiting for approval
            expect(result.message).toContain('admin approval');
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Auth Service Helper Functions', () => {
  let authService;

  beforeEach(() => {
    jest.resetModules();
    authService = require('../auth.service');
  });

  describe('generateOTP', () => {
    it('should generate 6-digit OTP', () => {
      fc.assert(
        fc.property(fc.integer(), () => {
          const otp = authService.generateOTP();
          
          expect(otp).toHaveLength(6);
          expect(/^[0-9]{6}$/.test(otp)).toBe(true);
          expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
          expect(parseInt(otp)).toBeLessThan(1000000);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify passwords correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password) => {
            const hash = await authService.hashPassword(password);
            
            // Hash should be different from password
            expect(hash).not.toBe(password);
            
            // Verification should succeed with correct password
            const isValid = await authService.verifyPassword(password, hash);
            expect(isValid).toBe(true);
            
            // Verification should fail with wrong password
            const isInvalid = await authService.verifyPassword(password + 'wrong', hash);
            expect(isInvalid).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
