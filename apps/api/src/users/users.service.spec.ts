import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    phone: '+1234567890',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    timezone: 'UTC',
    preferredLanguage: 'en',
    emailVerified: true,
    phoneVerified: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-id');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: expect.objectContaining({
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        }),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const updateData = {
      firstName: 'Jane',
      lastName: 'Smith',
      displayName: 'Jane Smith',
      bio: 'Updated bio',
      timezone: 'America/New_York',
      preferredLanguage: 'es',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-id', updateData);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: updateData,
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }),
      });
    });

    it('should update partial profile data', async () => {
      const partialUpdate = { firstName: 'Jane' };
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, ...partialUpdate });

      const result = await service.updateProfile('user-id', partialUpdate);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: partialUpdate,
        select: expect.any(Object),
      });
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar successfully', async () => {
      const newAvatarUrl = 'https://example.com/new-avatar.jpg';
      const updatedUser = { ...mockUser, avatarUrl: newAvatarUrl };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateAvatar('user-id', newAvatarUrl);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { avatarUrl: newAvatarUrl },
      });
    });
  });
});
