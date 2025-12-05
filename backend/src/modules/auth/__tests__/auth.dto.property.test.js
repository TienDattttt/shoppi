/**
 * Property-Based Tests for Auth DTOs
 * Tests serialization/deserialization correctness
 */

const fc = require('fast-check');
const {
  serializeUser,
  deserializeUser,
  SENSITIVE_FIELDS,
} = require('../auth.dto');

// Arbitrary generators for user data
const userRoleArb = fc.constantFrom('admin', 'partner', 'customer', 'shipper');
const userStatusArb = fc.constantFrom('pending', 'active', 'inactive', 'locked');

const baseUserArb = fc.record({
  id: fc.uuid(),
  email: fc.option(fc.emailAddress(), { nil: null }),
  phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/), { nil: null }),
  role: userRoleArb,
  status: userStatusArb,
  full_name: fc.string({ minLength: 1, maxLength: 255 }),
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  created_at: fc.date().map(d => d.toISOString()),
});

const partnerFieldsArb = fc.record({
  business_name: fc.option(fc.string({ minLength: 1, maxLength: 255 }), { nil: null }),
  tax_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
});

const shipperFieldsArb = fc.record({
  vehicle_type: fc.option(fc.constantFrom('motorcycle', 'car', 'bicycle', 'truck'), { nil: null }),
  vehicle_plate: fc.option(fc.stringMatching(/^[A-Z0-9]{5,10}$/), { nil: null }),
});

const sensitiveFieldsArb = fc.record({
  password_hash: fc.string({ minLength: 60, maxLength: 60 }),
  supabase_id: fc.uuid(),
  failed_login_attempts: fc.integer({ min: 0, max: 10 }),
  locked_until: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
});

// Generate complete user object based on role
const userArb = fc.tuple(baseUserArb, partnerFieldsArb, shipperFieldsArb, sensitiveFieldsArb)
  .map(([base, partner, shipper, sensitive]) => {
    const user = { ...base, ...sensitive };
    
    if (base.role === 'partner') {
      Object.assign(user, partner);
    } else if (base.role === 'shipper') {
      Object.assign(user, shipper);
    }
    
    return user;
  });

describe('Auth DTO Property Tests', () => {
  /**
   * **Feature: user-authentication, Property 28: User data serialization round-trip**
   * **Validates: Requirements 11.5**
   * 
   * For any valid User object, serializing to JSON then deserializing back
   * SHALL produce an equivalent User object (excluding sensitive fields).
   */
  describe('Property 28: User data serialization round-trip', () => {
    it('should preserve non-sensitive user data through serialize -> deserialize cycle', () => {
      fc.assert(
        fc.property(userArb, (user) => {
          // Serialize the user
          const serialized = serializeUser(user);
          
          // Deserialize back
          const deserialized = deserializeUser(serialized);
          
          // Check that key fields are preserved
          expect(deserialized.id).toBe(user.id);
          expect(deserialized.email).toBe(user.email);
          expect(deserialized.phone).toBe(user.phone);
          expect(deserialized.role).toBe(user.role);
          expect(deserialized.status).toBe(user.status);
          expect(deserialized.full_name).toBe(user.full_name);
          
          // Role-specific fields
          if (user.role === 'partner') {
            expect(deserialized.business_name).toBe(serialized.businessName);
          }
          if (user.role === 'shipper') {
            expect(deserialized.vehicle_type).toBe(serialized.vehicleType);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null user gracefully', () => {
      expect(serializeUser(null)).toBeNull();
      expect(deserializeUser(null)).toBeNull();
    });
  });

  /**
   * **Feature: user-authentication, Property 29: Sensitive field exclusion in serialization**
   * **Validates: Requirements 11.3**
   * 
   * For any User object serialization, the output SHALL NOT contain
   * password_hash, supabase_id, or other internal fields.
   */
  describe('Property 29: Sensitive field exclusion in serialization', () => {
    it('should never include sensitive fields in serialized output', () => {
      fc.assert(
        fc.property(userArb, (user) => {
          const serialized = serializeUser(user);
          
          // Check that no sensitive fields are present
          for (const sensitiveField of SENSITIVE_FIELDS) {
            // Convert snake_case to camelCase for checking
            const camelCaseField = sensitiveField.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            
            expect(serialized).not.toHaveProperty(sensitiveField);
            expect(serialized).not.toHaveProperty(camelCaseField);
          }
          
          // Explicitly check the most critical fields
          expect(serialized.password_hash).toBeUndefined();
          expect(serialized.passwordHash).toBeUndefined();
          expect(serialized.supabase_id).toBeUndefined();
          expect(serialized.supabaseId).toBeUndefined();
          expect(serialized.refresh_token_hash).toBeUndefined();
          expect(serialized.refreshTokenHash).toBeUndefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should only include whitelisted fields', () => {
      fc.assert(
        fc.property(userArb, (user) => {
          const serialized = serializeUser(user);
          const allowedFields = [
            'id', 'email', 'phone', 'role', 'status',
            'fullName', 'avatarUrl', 'createdAt',
            'businessName', 'taxId', // Partner fields
            'vehicleType', 'vehiclePlate', // Shipper fields
          ];
          
          for (const key of Object.keys(serialized)) {
            expect(allowedFields).toContain(key);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
