import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UserRole } from '@prisma/client';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    otpCode: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockFirebaseService = {
    verifyIdToken: jest.fn(),
    getUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id',
        email: registerDto.email,
        phone: registerDto.phone,
        role: UserRole.USER,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        createdAt: new Date(),
      });
      mockPrismaService.otpCode.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.otpCode.create.mockResolvedValue({ id: 'otp-1' });

      const result = await service.register(registerDto);

      expect(result.user.email).toBe(registerDto.email);
      expect(result.requiresVerification).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if phone already exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing-user' }); // phone check

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for weak password - too short', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({ ...registerDto, password: 'Short1!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without uppercase', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({ ...registerDto, password: 'securepass123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without lowercase', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({ ...registerDto, password: 'SECUREPASS123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without number', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({ ...registerDto, password: 'SecurePassword!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without special character', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({ ...registerDto, password: 'SecurePassword123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should register user with THERAPIST role', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id',
        email: registerDto.email,
        role: UserRole.THERAPIST,
        createdAt: new Date(),
      });
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.register({ ...registerDto, role: UserRole.THERAPIST });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: UserRole.THERAPIST }),
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      phone: '+1234567890',
      passwordHash: 'hashedPassword',
      role: UserRole.USER,
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: null,
      phoneVerified: true,
    };

    it('should login successfully with valid credentials and verified phone', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto) as any;

      expect(result.user.email).toBe(loginDto.email);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should require verification for unverified phone', async () => {
      const unverifiedUser = { ...mockUser, phoneVerified: false };
      mockPrismaService.user.findUnique.mockResolvedValue(unverifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.otpCode.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.otpCode.create.mockResolvedValue({ id: 'otp-1' });

      const result = await service.login(loginDto) as any;

      expect(result.requiresVerification).toBe(true);
      expect(result.user.id).toBe(mockUser.id);
      expect(result.accessToken).toBeUndefined();
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for user without password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: null });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com', role: UserRole.USER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('user-id');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid user', async () => {
      const mockUser = { id: 'user-id', role: UserRole.USER };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshToken('user-id');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('non-existent-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});
