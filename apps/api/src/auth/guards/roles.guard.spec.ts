import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from './roles.guard';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(() => {
    reflector = mockReflector as unknown as Reflector;
    guard = new RolesGuard(reflector);
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: { role: UserRole }): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ role: UserRole.USER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.ADMIN });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.USER });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true when user has one of multiple required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.THERAPIST]);
      const context = createMockExecutionContext({ role: UserRole.THERAPIST });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user role is not in required roles list', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.THERAPIST]);
      const context = createMockExecutionContext({ role: UserRole.USER });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should call reflector with correct parameters', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ role: UserRole.USER });

      guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('ROLES_KEY', () => {
    it('should be defined', () => {
      expect(ROLES_KEY).toBe('roles');
    });
  });
});
