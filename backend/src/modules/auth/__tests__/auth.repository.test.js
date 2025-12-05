/**
 * Unit Tests for Auth Repository
 * Tests CRUD operations with mocked database
 */

const { normalizePhone } = require('../auth.repository');

// Mock Supabase client
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    rpc: jest.fn(),
  },
}));

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
const authRepository = require('../auth.repository');

describe('Auth Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Operations', () => {
    describe('createUser', () => {
      it('should create a new user successfully', async () => {
        const mockUser = {
          id: 'test-uuid',
          email: 'test@example.com',
          role: 'customer',
          status: 'pending',
          full_name: 'Test User',
        };

        const mockChain = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        const result = await authRepository.createUser({
          email: 'test@example.com',
          role: 'customer',
          full_name: 'Test User',
        });

        expect(supabaseAdmin.from).toHaveBeenCalledWith('users');
        expect(result).toEqual(mockUser);
      });

      it('should throw error on database failure', async () => {
        const mockChain = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Database error' } 
          }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        await expect(authRepository.createUser({
          email: 'test@example.com',
        })).rejects.toThrow('Failed to create user');
      });
    });

    describe('findUserByEmail', () => {
      it('should find user by email', async () => {
        const mockUser = { id: 'test-uuid', email: 'test@example.com' };
        
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        const result = await authRepository.findUserByEmail('test@example.com');

        expect(result).toEqual(mockUser);
        expect(mockChain.eq).toHaveBeenCalledWith('email', 'test@example.com');
      });

      it('should return null when user not found', async () => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116' } 
          }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        const result = await authRepository.findUserByEmail('notfound@example.com');

        expect(result).toBeNull();
      });
    });

    describe('findUserByPhone', () => {
      it('should normalize and find user by phone', async () => {
        const mockUser = { id: 'test-uuid', phone: '+84912345678' };
        
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        const result = await authRepository.findUserByPhone('0912345678');

        expect(result).toEqual(mockUser);
        expect(mockChain.eq).toHaveBeenCalledWith('phone', '+84912345678');
      });
    });
  });

  describe('Session Operations', () => {
    describe('createSession', () => {
      it('should create a new session', async () => {
        const mockSession = {
          id: 'session-uuid',
          user_id: 'user-uuid',
          refresh_token_hash: 'hash',
        };

        const mockChain = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        const result = await authRepository.createSession({
          user_id: 'user-uuid',
          refresh_token_hash: 'hash',
          expires_at: new Date().toISOString(),
        });

        expect(supabaseAdmin.from).toHaveBeenCalledWith('sessions');
        expect(result).toEqual(mockSession);
      });
    });

    describe('findSessionsByUserId', () => {
      it('should return active sessions for user', async () => {
        const mockSessions = [
          { id: 'session-1', user_id: 'user-uuid' },
          { id: 'session-2', user_id: 'user-uuid' },
        ];

        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockSessions, error: null }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        const result = await authRepository.findSessionsByUserId('user-uuid');

        expect(result).toEqual(mockSessions);
        expect(result).toHaveLength(2);
      });
    });

    describe('deleteSession', () => {
      it('should delete session by ID', async () => {
        const mockChain = {
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        await authRepository.deleteSession('session-uuid');

        expect(supabaseAdmin.from).toHaveBeenCalledWith('sessions');
        expect(mockChain.delete).toHaveBeenCalled();
      });
    });
  });

  describe('OTP Operations', () => {
    describe('createOTP', () => {
      it('should create OTP with expiration', async () => {
        const mockOTP = {
          id: 'otp-uuid',
          identifier: '+84912345678',
          otp_code: '123456',
          purpose: 'registration',
        };

        const mockChain = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockOTP, error: null }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        const result = await authRepository.createOTP({
          identifier: '+84912345678',
          otp_code: '123456',
          purpose: 'registration',
        });

        expect(supabaseAdmin.from).toHaveBeenCalledWith('otps');
        expect(result).toEqual(mockOTP);
      });
    });

    describe('findValidOTP', () => {
      it('should find valid unexpired OTP', async () => {
        const mockOTP = {
          id: 'otp-uuid',
          otp_code: '123456',
          verified_at: null,
        };

        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockOTP, error: null }),
        };
        supabaseAdmin.from.mockReturnValue(mockChain);

        const result = await authRepository.findValidOTP('+84912345678', 'registration');

        expect(result).toEqual(mockOTP);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('normalizePhone', () => {
      it('should convert 0xxx to +84xxx', () => {
        expect(normalizePhone('0912345678')).toBe('+84912345678');
      });

      it('should convert 84xxx to +84xxx', () => {
        expect(normalizePhone('84912345678')).toBe('+84912345678');
      });

      it('should keep +84xxx as is', () => {
        expect(normalizePhone('+84912345678')).toBe('+84912345678');
      });

      it('should remove non-digit characters', () => {
        expect(normalizePhone('091-234-5678')).toBe('+84912345678');
        expect(normalizePhone('091 234 5678')).toBe('+84912345678');
      });
    });
  });
});
