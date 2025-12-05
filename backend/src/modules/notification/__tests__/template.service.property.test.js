/**
 * Property-Based Tests for Template Service
 * Tests template variable replacement and missing variable handling
 */

const fc = require('fast-check');

// Mock Supabase client
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

const { renderTemplate, extractVariables } = require('../services/template.service');

// Arbitrary generators
const variableNameArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'.split('')),
  { minLength: 1, maxLength: 20 }
);

const variableValueArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 100 }),
  fc.integer(),
  fc.constant('')
);

describe('Template Service Property Tests', () => {
  /**
   * **Feature: notification-system, Property 9: Template variable replacement**
   * **Validates: Requirements 4.1, 4.2**
   *
   * For any template with variables, rendering SHALL replace all {{variable}} with provided values.
   */
  describe('Property 9: Template variable replacement', () => {
    it('should replace all {{variable}} patterns with provided values', () => {
      fc.assert(
        fc.property(
          variableNameArb,
          variableValueArb,
          (varName, varValue) => {
            const template = {
              title_template: `Hello {{${varName}}}!`,
              body_template: `Your value is {{${varName}}}.`,
            };

            const data = { [varName]: varValue };
            const result = renderTemplate(template, data);

            // Variable should be replaced with value
            expect(result.title).toBe(`Hello ${varValue}!`);
            expect(result.body).toBe(`Your value is ${varValue}.`);

            // No {{variable}} patterns should remain
            expect(result.title).not.toMatch(/\{\{\w+\}\}/);
            expect(result.body).not.toMatch(/\{\{\w+\}\}/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should replace multiple different variables in same template', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(variableNameArb, variableValueArb), { minLength: 1, maxLength: 5 }),
          (varPairs) => {
            // Create unique variable names
            const uniqueVars = new Map();
            varPairs.forEach(([name, value]) => {
              if (!uniqueVars.has(name)) {
                uniqueVars.set(name, value);
              }
            });

            // Build template with all variables
            const varNames = Array.from(uniqueVars.keys());
            const titleParts = varNames.map(name => `{{${name}}}`).join(' ');
            
            const template = {
              title_template: titleParts,
              body_template: `Values: ${titleParts}`,
            };

            const data = Object.fromEntries(uniqueVars);
            const result = renderTemplate(template, data);

            // All variables should be replaced
            varNames.forEach(name => {
              expect(result.title).not.toContain(`{{${name}}}`);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle same variable appearing multiple times', () => {
      fc.assert(
        fc.property(variableNameArb, variableValueArb, (varName, varValue) => {
          const template = {
            title_template: `{{${varName}}} and {{${varName}}} again`,
            body_template: `{{${varName}}}`,
          };

          const data = { [varName]: varValue };
          const result = renderTemplate(template, data);

          // Both occurrences should be replaced
          expect(result.title).toBe(`${varValue} and ${varValue} again`);
          expect(result.body).toBe(`${varValue}`);
        }),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: notification-system, Property 10: Missing variable handling**
   * **Validates: Requirements 4.4**
   *
   * For any template variable not provided, the system SHALL use empty string or default value.
   */
  describe('Property 10: Missing variable handling', () => {
    it('should replace missing variables with empty string', () => {
      fc.assert(
        fc.property(variableNameArb, (varName) => {
          const template = {
            title_template: `Hello {{${varName}}}!`,
            body_template: `Value: {{${varName}}}`,
          };

          // Provide empty data object - variable is missing
          const result = renderTemplate(template, {});

          // Missing variable should be replaced with empty string
          expect(result.title).toBe('Hello !');
          expect(result.body).toBe('Value: ');

          // No {{variable}} patterns should remain
          expect(result.title).not.toMatch(/\{\{\w+\}\}/);
          expect(result.body).not.toMatch(/\{\{\w+\}\}/);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle mix of provided and missing variables', () => {
      fc.assert(
        fc.property(
          variableNameArb,
          variableNameArb,
          variableValueArb,
          (providedVar, missingVar, providedValue) => {
            // Ensure different variable names
            const actualMissingVar = providedVar === missingVar ? missingVar + '_missing' : missingVar;

            const template = {
              title_template: `{{${providedVar}}} and {{${actualMissingVar}}}`,
              body_template: `Provided: {{${providedVar}}}, Missing: {{${actualMissingVar}}}`,
            };

            const data = { [providedVar]: providedValue };
            const result = renderTemplate(template, data);

            // Provided variable should have value, missing should be empty
            expect(result.title).toBe(`${providedValue} and `);
            expect(result.body).toBe(`Provided: ${providedValue}, Missing: `);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle undefined values as empty string', () => {
      fc.assert(
        fc.property(variableNameArb, (varName) => {
          const template = {
            title_template: `Value: {{${varName}}}`,
            body_template: `{{${varName}}}`,
          };

          const data = { [varName]: undefined };
          const result = renderTemplate(template, data);

          // Undefined should be treated as empty string
          expect(result.title).toBe('Value: ');
          expect(result.body).toBe('');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Extract Variables', () => {
    it('should extract all unique variable names from template', () => {
      fc.assert(
        fc.property(
          fc.array(variableNameArb, { minLength: 1, maxLength: 5 }),
          (varNames) => {
            const uniqueNames = [...new Set(varNames)];
            const templateString = uniqueNames.map(name => `{{${name}}}`).join(' ');

            const extracted = extractVariables(templateString);

            // Should extract all unique variables
            expect(extracted.length).toBe(uniqueNames.length);
            uniqueNames.forEach(name => {
              expect(extracted).toContain(name);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array for template without variables', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }).filter(s => !s.includes('{{')),
          (text) => {
            const extracted = extractVariables(text);
            expect(extracted).toEqual([]);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Render Template Edge Cases', () => {
    it('should return empty strings for null template', () => {
      const result = renderTemplate(null, { name: 'test' });
      expect(result.title).toBe('');
      expect(result.body).toBe('');
    });

    it('should handle template with no variables', () => {
      const template = {
        title_template: 'Static Title',
        body_template: 'Static Body',
      };

      const result = renderTemplate(template, { unused: 'value' });
      expect(result.title).toBe('Static Title');
      expect(result.body).toBe('Static Body');
    });
  });
});
