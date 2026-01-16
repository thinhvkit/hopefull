import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TherapistsService } from './therapists.service';
import { PrismaService } from '../prisma/prisma.service';
import { TherapistVerificationStatus } from '@prisma/client';

describe('TherapistsService', () => {
  let service: TherapistsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    therapist: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockTherapist = {
    id: 'therapist-id',
    userId: 'user-id',
    professionalTitle: 'Licensed Therapist',
    yearsOfExperience: 5,
    city: 'New York',
    state: 'NY',
    country: 'USA',
    verificationStatus: TherapistVerificationStatus.APPROVED,
    isOnline: true,
    hourlyRate: 10000,
    perMinuteRate: 200,
    averageRating: 4.5,
    totalReviews: 10,
    totalBookings: 50,
    user: {
      id: 'user-id',
      firstName: 'Dr. John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    languages: [{ id: 'lang-1', language: 'English', proficiency: 'NATIVE' }],
    specializations: [
      { specialization: { id: 'spec-1', name: 'Anxiety' } },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TherapistsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TherapistsService>(TherapistsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated list of therapists', async () => {
      mockPrismaService.therapist.findMany.mockResolvedValue([mockTherapist]);
      mockPrismaService.therapist.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should apply pagination parameters', async () => {
      mockPrismaService.therapist.findMany.mockResolvedValue([]);
      mockPrismaService.therapist.count.mockResolvedValue(100);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(10);
      expect(mockPrismaService.therapist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should filter by search term', async () => {
      mockPrismaService.therapist.findMany.mockResolvedValue([mockTherapist]);
      mockPrismaService.therapist.count.mockResolvedValue(1);

      await service.findAll({ search: 'John' });

      expect(mockPrismaService.therapist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { user: { firstName: { contains: 'John', mode: 'insensitive' } } },
            ]),
          }),
        }),
      );
    });

    it('should filter by specialization', async () => {
      mockPrismaService.therapist.findMany.mockResolvedValue([]);
      mockPrismaService.therapist.count.mockResolvedValue(0);

      await service.findAll({ specialization: 'Anxiety' });

      expect(mockPrismaService.therapist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            specializations: { some: { specialization: { name: 'Anxiety' } } },
          }),
        }),
      );
    });

    it('should filter by language', async () => {
      mockPrismaService.therapist.findMany.mockResolvedValue([]);
      mockPrismaService.therapist.count.mockResolvedValue(0);

      await service.findAll({ language: 'English' });

      expect(mockPrismaService.therapist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            languages: { some: { language: 'English' } },
          }),
        }),
      );
    });

    it('should filter by minimum rating', async () => {
      mockPrismaService.therapist.findMany.mockResolvedValue([]);
      mockPrismaService.therapist.count.mockResolvedValue(0);

      await service.findAll({ minRating: 4.0 });

      expect(mockPrismaService.therapist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            averageRating: { gte: 4.0 },
          }),
        }),
      );
    });

    it('should filter by max price', async () => {
      mockPrismaService.therapist.findMany.mockResolvedValue([]);
      mockPrismaService.therapist.count.mockResolvedValue(0);

      await service.findAll({ maxPrice: 15000 });

      expect(mockPrismaService.therapist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hourlyRate: { lte: 15000 },
          }),
        }),
      );
    });

    it('should filter by online status', async () => {
      mockPrismaService.therapist.findMany.mockResolvedValue([]);
      mockPrismaService.therapist.count.mockResolvedValue(0);

      await service.findAll({ isOnline: true });

      expect(mockPrismaService.therapist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isOnline: true,
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return therapist when found', async () => {
      mockPrismaService.therapist.findUnique.mockResolvedValue(mockTherapist);

      const result = await service.findById('therapist-id');

      expect(result).toEqual(mockTherapist);
    });

    it('should throw NotFoundException when therapist not found', async () => {
      mockPrismaService.therapist.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available slots for a date', async () => {
      const mockTherapistWithAvailability = {
        ...mockTherapist,
        availabilities: [
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
        ],
        blockedSlots: [],
        appointments: [],
      };
      mockPrismaService.therapist.findUnique.mockResolvedValue(mockTherapistWithAvailability);

      const result = await service.getAvailableSlots('therapist-id', '2024-01-10'); // Wednesday

      expect(result.date).toBe('2024-01-10');
      expect(result.slots).toHaveLength(1);
    });

    it('should throw NotFoundException when therapist not found', async () => {
      mockPrismaService.therapist.findUnique.mockResolvedValue(null);

      await expect(service.getAvailableSlots('non-existent-id', '2024-01-10')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOnlineStatus', () => {
    it('should update online status to true', async () => {
      mockPrismaService.therapist.update.mockResolvedValue({ ...mockTherapist, isOnline: true });

      const result = await service.updateOnlineStatus('therapist-id', true);

      expect(result.isOnline).toBe(true);
      expect(mockPrismaService.therapist.update).toHaveBeenCalledWith({
        where: { id: 'therapist-id' },
        data: { isOnline: true },
      });
    });

    it('should update online status to false', async () => {
      mockPrismaService.therapist.update.mockResolvedValue({ ...mockTherapist, isOnline: false });

      const result = await service.updateOnlineStatus('therapist-id', false);

      expect(result.isOnline).toBe(false);
    });
  });

  describe('getReviews', () => {
    const mockReview = {
      id: 'review-id',
      rating: 5,
      feedback: 'Great therapist!',
      isAnonymous: false,
      createdAt: new Date(),
      user: { firstName: 'Jane', lastName: 'Doe', avatarUrl: null },
    };

    it('should return paginated reviews', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([mockReview]);
      mockPrismaService.review.count.mockResolvedValue(1);

      const result = await service.getReviews('therapist-id');

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should hide user info for anonymous reviews', async () => {
      const anonymousReview = { ...mockReview, isAnonymous: true };
      mockPrismaService.review.findMany.mockResolvedValue([anonymousReview]);
      mockPrismaService.review.count.mockResolvedValue(1);

      const result = await service.getReviews('therapist-id');

      expect(result.data[0].user).toBeNull();
    });

    it('should apply pagination parameters', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.review.count.mockResolvedValue(50);

      const result = await service.getReviews('therapist-id', 2, 5);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });
});
