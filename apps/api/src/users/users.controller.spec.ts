import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole, UserStatus } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
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
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith('user-id');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Updated bio',
      };
      const updatedUser = { ...mockUser, ...updateData };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockRequest, updateData);

      expect(result).toEqual(updatedUser);
      expect(usersService.updateProfile).toHaveBeenCalledWith('user-id', updateData);
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getUser('user-id');

      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith('user-id');
    });
  });
});
