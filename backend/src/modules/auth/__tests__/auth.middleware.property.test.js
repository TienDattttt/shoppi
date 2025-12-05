/**
 * Property-Based Tests for Auth Middleware
 * Tests JWT validation and role-based access control
 */

const fc = require('fast-check');
const jwt = require('jsonwebtoken');

// Mock config
jest.mock('../../../config', () => ({
  jwt: {
    accessSecret: 'test-access-secret-key-32-chars!!',
    refreshSecret: 'test-refresh-secret-key-32-chars!',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  otp: { expiresInMinutes: 5, maxAttempts: 5, lockoutMinutes: 15, maxRequestsPerWindow: 3, requestWindowMinutes: 5 },
  security: { maxLoginAttempts: 5, lockoutMinutes: 30 },
  nodeEnv: 'test',
}));

// Mock Supabase (required by auth.service)
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: { from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
  })},
}));

const config = require('../../../config');
const authMiddleware = require('../auth.middleware');

// Generators
const userIdArb = fc.uuid();
const roleArb = fc.constantFrom('admin', 'partner', 'customer', 'shipper');
const sessionIdArb = fc.uuid();

// Mock Express request/response
function createMockReq(headers = {}) {
  return {
    headers,
    user: null,
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((data) => {
      res.body = data;
      return res;
    }),
  };
  return res;
}

describe('Auth Middleware Property Tests', () => {
  /**
   * **Feature: user-authentication, Property 22: JWT validation extracts correct role**
   * **Validates: Requirements 9.1**
   * 
   * For any valid JWT token, the middleware SHALL correctly extract
   * and verify user_id and role claims.
   */
  describe('Property 22: JWT validation extracts correct role', () => {
    it('should extract userId and role from valid token', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          // Create valid token
          const token = jwt.sign(
            { userId, role, sessionId },
            config.jwt.accessSecret,
            { expiresIn: '15m' }
          );

          const req = createMockReq({ authorization: `Bearer ${token}` });
          const res = createMockRes();
          const next = jest.fn();

          authMiddleware.authenticate(req, res, next);

          // Should call next and attach user info
          expect(next).toHaveBeenCalled();
          expect(req.user).toBeDefined();
          expect(req.user.userId).toBe(userId);
          expect(req.user.role).toBe(role);
          expect(req.user.sessionId).toBe(sessionId);
        }),
        { numRuns: 50 }
      );
    });

    it('should handle token without Bearer prefix', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          const token = jwt.sign(
            { userId, role, sessionId },
            config.jwt.accessSecret,
            { expiresIn: '15m' }
          );

          // Token without Bearer prefix
          const req = createMockReq({ authorization: token });
          const res = createMockRes();
          const next = jest.fn();

          authMiddleware.authenticate(req, res, next);

          expect(next).toHaveBeenCalled();
          expect(req.user.userId).toBe(userId);
        }),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Feature: user-authentication, Property 24: Expired JWT rejection**
   * **Validates: Requirements 9.5**
   * 
   * For any expired or invalid JWT token, requests SHALL receive 401 Unauthorized.
   */
  describe('Property 24: Expired JWT rejection', () => {
    it('should reject expired tokens with 401', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          // Create expired token
          const token = jwt.sign(
            { userId, role, sessionId },
            config.jwt.accessSecret,
            { expiresIn: '-1h' } // Already expired
          );

          const req = createMockReq({ authorization: `Bearer ${token}` });
          const res = createMockRes();
          const next = jest.fn();

          authMiddleware.authenticate(req, res, next);

          // Should not call next
          expect(next).not.toHaveBeenCalled();
          // Should return 401
          expect(res.statusCode).toBe(401);
          expect(res.body.success).toBe(false);
        }),
        { numRuns: 20 }
      );
    });

    it('should reject invalid tokens with 401', () => {
      const invalidTokens = [
        'invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
      ];

      invalidTokens.forEach(token => {
        const req = createMockReq({ authorization: `Bearer ${token}` });
        const res = createMockRes();
        const next = jest.fn();

        authMiddleware.authenticate(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(401);
      });
    });

    it('should reject requests without token', () => {
      const req = createMockReq({});
      const res = createMockRes();
      const next = jest.fn();

      authMiddleware.authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
      expect(res.body.error.message).toContain('No token');
    });

    it('should reject tokens signed with wrong secret', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          // Create token with wrong secret
          const token = jwt.sign(
            { userId, role, sessionId },
            'wrong-secret-key',
            { expiresIn: '15m' }
          );

          const req = createMockReq({ authorization: `Bearer ${token}` });
          const res = createMockRes();
          const next = jest.fn();

          authMiddleware.authenticate(req, res, next);

          expect(next).not.toHaveBeenCalled();
          expect(res.statusCode).toBe(401);
        }),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Feature: user-authentication, Property 23: Role-based access control enforcement**
   * **Validates: Requirements 9.2, 9.3, 9.4**
   * 
   * For any protected endpoint with role requirement, requests from users
   * without the required role SHALL receive 403 Forbidden.
   */
  describe('Property 23: Role-based access control enforcement', () => {
    it('should allow access for users with required role', () => {
      const roles = ['admin', 'partner', 'customer', 'shipper'];

      roles.forEach(role => {
        const req = createMockReq({});
        req.user = { userId: 'test-user', role, sessionId: 'test-session' };
        const res = createMockRes();
        const next = jest.fn();

        const middleware = authMiddleware.requireRole(role);
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200); // Not changed
      });
    });

    it('should deny access for users without required role', () => {
      fc.assert(
        fc.property(roleArb, roleArb, (userRole, requiredRole) => {
          // Skip if roles match
          if (userRole === requiredRole) return;

          const req = createMockReq({});
          req.user = { userId: 'test-user', role: userRole, sessionId: 'test-session' };
          const res = createMockRes();
          const next = jest.fn();

          const middleware = authMiddleware.requireRole(requiredRole);
          middleware(req, res, next);

          // Should not call next
          expect(next).not.toHaveBeenCalled();
          // Should return 403
          expect(res.statusCode).toBe(403);
        }),
        { numRuns: 50 }
      );
    });

    it('should allow multiple roles', () => {
      const req = createMockReq({});
      req.user = { userId: 'test-user', role: 'partner', sessionId: 'test-session' };
      const res = createMockRes();
      const next = jest.fn();

      const middleware = authMiddleware.requireRole('admin', 'partner');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should require authentication before role check', () => {
      const req = createMockReq({});
      req.user = null; // Not authenticated
      const res = createMockRes();
      const next = jest.fn();

      const middleware = authMiddleware.requireRole('admin');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });

    describe('Specific role middleware', () => {
      it('requireAdmin should only allow admin', () => {
        const roles = ['admin', 'partner', 'customer', 'shipper'];

        roles.forEach(role => {
          const req = createMockReq({});
          req.user = { userId: 'test', role, sessionId: 'test' };
          const res = createMockRes();
          const next = jest.fn();

          authMiddleware.requireAdmin(req, res, next);

          if (role === 'admin') {
            expect(next).toHaveBeenCalled();
          } else {
            expect(next).not.toHaveBeenCalled();
            expect(res.statusCode).toBe(403);
          }
        });
      });

      it('requirePartner should only allow partner', () => {
        const req = createMockReq({});
        req.user = { userId: 'test', role: 'partner', sessionId: 'test' };
        const res = createMockRes();
        const next = jest.fn();

        authMiddleware.requirePartner(req, res, next);
        expect(next).toHaveBeenCalled();

        // Customer should be denied
        req.user.role = 'customer';
        const res2 = createMockRes();
        const next2 = jest.fn();
        authMiddleware.requirePartner(req, res2, next2);
        expect(next2).not.toHaveBeenCalled();
        expect(res2.statusCode).toBe(403);
      });
    });
  });

  describe('Optional Authentication', () => {
    it('should attach user if valid token provided', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          const token = jwt.sign(
            { userId, role, sessionId },
            config.jwt.accessSecret,
            { expiresIn: '15m' }
          );

          const req = createMockReq({ authorization: `Bearer ${token}` });
          const res = createMockRes();
          const next = jest.fn();

          authMiddleware.optionalAuth(req, res, next);

          expect(next).toHaveBeenCalled();
          expect(req.user).toBeDefined();
          expect(req.user.userId).toBe(userId);
        }),
        { numRuns: 20 }
      );
    });

    it('should set user to null if no token', () => {
      const req = createMockReq({});
      const res = createMockRes();
      const next = jest.fn();

      authMiddleware.optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('should set user to null if invalid token', () => {
      const req = createMockReq({ authorization: 'Bearer invalid-token' });
      const res = createMockRes();
      const next = jest.fn();

      authMiddleware.optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });
  });

  describe('Ownership Check', () => {
    it('should allow access to own resources', () => {
      const userId = 'user-123';
      const req = createMockReq({});
      req.user = { userId, role: 'customer', sessionId: 'test' };
      req.params = { userId };
      const res = createMockRes();
      const next = jest.fn();

      const middleware = authMiddleware.requireOwnership(req => req.params.userId);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access to other users resources', () => {
      const req = createMockReq({});
      req.user = { userId: 'user-123', role: 'customer', sessionId: 'test' };
      req.params = { userId: 'other-user-456' };
      const res = createMockRes();
      const next = jest.fn();

      const middleware = authMiddleware.requireOwnership(req => req.params.userId);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('should allow admin to access any resource', () => {
      const req = createMockReq({});
      req.user = { userId: 'admin-user', role: 'admin', sessionId: 'test' };
      req.params = { userId: 'other-user-456' };
      const res = createMockRes();
      const next = jest.fn();

      const middleware = authMiddleware.requireOwnership(req => req.params.userId);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
