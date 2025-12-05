/**
 * Property-Based Tests for Auth Validators
 * Tests password complexity and input validation
 */

const fc = require('fast-check');
const { validatePasswordComplexity, passwordSchema } = require('../auth.validator');

// Generators for different password types
const lowercaseArb = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1 });
const uppercaseArb = fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), { minLength: 1 });
const digitArb = fc.stringOf(fc.constantFrom(...'0123456789'), { minLength: 1 });

// Valid password generator (meets all requirements)
const validPasswordArb = fc.tuple(
  lowercaseArb,
  uppercaseArb,
  digitArb,
  fc.string({ minLength: 0, maxLength: 50 })
).map(([lower, upper, digit, extra]) => {
  // Ensure minimum length of 8
  const base = lower.slice(0, 2) + upper.slice(0, 2) + digit.slice(0, 2);
  const padding = extra.slice(0, Math.max(0, 8 - base.length - 2));
  return base + padding + 'aA';
}).filter(p => p.length >= 8 && p.length <= 128);

// Invalid password generators
const tooShortPasswordArb = fc.string({ minLength: 1, maxLength: 7 });
const noUppercasePasswordArb = fc.tuple(lowercaseArb, digitArb)
  .map(([lower, digit]) => (lower + digit).slice(0, 20))
  .filter(p => p.length >= 8 && !/[A-Z]/.test(p));
const noLowercasePasswordArb = fc.tuple(uppercaseArb, digitArb)
  .map(([upper, digit]) => (upper + digit).slice(0, 20))
  .filter(p => p.length >= 8 && !/[a-z]/.test(p));
const noDigitPasswordArb = fc.tuple(lowercaseArb, uppercaseArb)
  .map(([lower, upper]) => (lower + upper).slice(0, 20))
  .filter(p => p.length >= 8 && !/\d/.test(p));

// Whitespace-only password
const whitespacePasswordArb = fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 8, maxLength: 20 });

describe('Auth Validator Property Tests', () => {
  /**
   * **Feature: user-authentication, Property 21: Password complexity validation**
   * **Validates: Requirements 8.4**
   * 
   * For any password that does not meet complexity requirements
   * (min 8 chars, 1 uppercase, 1 lowercase, 1 number),
   * registration or password reset SHALL be rejected.
   */
  describe('Property 21: Password complexity validation', () => {
    it('should accept passwords meeting all complexity requirements', () => {
      fc.assert(
        fc.property(validPasswordArb, (password) => {
          const result = validatePasswordComplexity(password);
          
          // Valid passwords should pass
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject passwords shorter than 8 characters', () => {
      fc.assert(
        fc.property(tooShortPasswordArb, (password) => {
          const result = validatePasswordComplexity(password);
          
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Password must be at least 8 characters');
        }),
        { numRuns: 100 }
      );
    });

    it('should reject passwords without uppercase letters', () => {
      fc.assert(
        fc.property(noUppercasePasswordArb, (password) => {
          const result = validatePasswordComplexity(password);
          
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Password must contain at least 1 uppercase letter');
        }),
        { numRuns: 50 }
      );
    });

    it('should reject passwords without lowercase letters', () => {
      fc.assert(
        fc.property(noLowercasePasswordArb, (password) => {
          const result = validatePasswordComplexity(password);
          
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Password must contain at least 1 lowercase letter');
        }),
        { numRuns: 50 }
      );
    });

    it('should reject passwords without digits', () => {
      fc.assert(
        fc.property(noDigitPasswordArb, (password) => {
          const result = validatePasswordComplexity(password);
          
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Password must contain at least 1 number');
        }),
        { numRuns: 50 }
      );
    });

    it('should reject null or undefined passwords', () => {
      expect(validatePasswordComplexity(null).isValid).toBe(false);
      expect(validatePasswordComplexity(undefined).isValid).toBe(false);
      expect(validatePasswordComplexity('').isValid).toBe(false);
    });

    it('should reject whitespace-only passwords', () => {
      fc.assert(
        fc.property(whitespacePasswordArb, (password) => {
          const result = validatePasswordComplexity(password);
          
          // Whitespace passwords fail multiple requirements
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });

    it('should collect all validation errors for invalid passwords', () => {
      // Password with no uppercase, no digit, too short
      const result = validatePasswordComplexity('abc');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
      expect(result.errors).toContain('Password must contain at least 1 uppercase letter');
      expect(result.errors).toContain('Password must contain at least 1 number');
    });
  });

  describe('Joi Password Schema Validation', () => {
    it('should validate passwords consistently with validatePasswordComplexity', () => {
      fc.assert(
        fc.property(validPasswordArb, (password) => {
          const joiResult = passwordSchema.validate(password);
          const customResult = validatePasswordComplexity(password);
          
          // Both should agree on valid passwords
          expect(joiResult.error).toBeUndefined();
          expect(customResult.isValid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });
});
