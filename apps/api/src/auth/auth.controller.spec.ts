import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const expectedResult = {
        user: { id: 'user-id', email: registerDto.email },
        accessToken: 'token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const expectedResult = {
        user: { id: 'user-id', email: loginDto.email, role: UserRole.USER },
        accessToken: 'token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    it('should return new tokens', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(expectedResult);

      const result = await controller.refresh(mockRequest);

      expect(result).toEqual(expectedResult);
      expect(authService.refreshToken).toHaveBeenCalledWith('user-id');
    });
  });

  describe('getMe', () => {
    it('should return current user', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const expectedResult = {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      mockAuthService.validateUser.mockResolvedValue(expectedResult);

      const result = await controller.getMe(mockRequest);

      expect(result).toEqual(expectedResult);
      expect(authService.validateUser).toHaveBeenCalledWith('user-id');
    });
  });
});
