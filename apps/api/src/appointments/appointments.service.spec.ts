import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    therapist: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    appointment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    review: {
      create: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockAppointment = {
    id: 'appointment-id',
    userId: 'user-id',
    therapistId: 'therapist-id',
    scheduledAt: new Date('2024-01-15T10:00:00Z'),
    duration: 60,
    timezone: 'UTC',
    type: AppointmentType.SCHEDULED,
    status: AppointmentStatus.PENDING,
    amount: 10000,
    bookingNotes: 'First session',
    createdAt: new Date(),
  };

  const mockTherapist = {
    id: 'therapist-id',
    userId: 'therapist-user-id',
    hourlyRate: 10000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createData = {
      userId: 'user-id',
      therapistId: 'therapist-id',
      scheduledAt: new Date('2024-01-15T10:00:00Z'),
      duration: 60,
      timezone: 'UTC',
      amount: 10000,
    };

    it('should create appointment successfully', async () => {
      mockPrismaService.therapist.findUnique.mockResolvedValue(mockTherapist);
      mockPrismaService.appointment.findFirst.mockResolvedValue(null);
      mockPrismaService.appointment.create.mockResolvedValue(mockAppointment);

      const result = await service.create(createData);

      expect(result).toEqual(mockAppointment);
      expect(mockPrismaService.appointment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when therapist not found', async () => {
      mockPrismaService.therapist.findUnique.mockResolvedValue(null);

      await expect(service.create(createData)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when time slot is not available', async () => {
      mockPrismaService.therapist.findUnique.mockResolvedValue(mockTherapist);
      mockPrismaService.appointment.findFirst.mockResolvedValue(mockAppointment);

      await expect(service.create(createData)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByUser', () => {
    it('should return all appointments for user', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([mockAppointment]);

      const result = await service.findByUser('user-id');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-id' },
        }),
      );
    });

    it('should filter upcoming appointments', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([]);

      await service.findByUser('user-id', 'upcoming');

      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id',
            scheduledAt: { gte: expect.any(Date) },
            status: { in: ['PENDING', 'CONFIRMED'] },
          }),
        }),
      );
    });

    it('should filter past appointments', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([]);

      await service.findByUser('user-id', 'past');

      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id',
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findByTherapist', () => {
    it('should return all appointments for therapist', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([mockAppointment]);

      const result = await service.findByTherapist('therapist-id');

      expect(result).toHaveLength(1);
    });

    it('should filter upcoming appointments for therapist', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([]);

      await service.findByTherapist('therapist-id', 'upcoming');

      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            therapistId: 'therapist-id',
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return appointment when found', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);

      const result = await service.findById('appointment-id');

      expect(result).toEqual(mockAppointment);
    });

    it('should throw NotFoundException when appointment not found', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirm', () => {
    it('should confirm appointment successfully', async () => {
      const pendingAppointment = { ...mockAppointment, status: AppointmentStatus.PENDING };
      mockPrismaService.appointment.findUnique.mockResolvedValue(pendingAppointment);
      mockPrismaService.appointment.update.mockResolvedValue({
        ...pendingAppointment,
        status: AppointmentStatus.CONFIRMED,
      });

      const result = await service.confirm('appointment-id', 'therapist-id');

      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('should throw NotFoundException when appointment not found', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(null);

      await expect(service.confirm('non-existent-id', 'therapist-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not authorized', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);

      await expect(service.confirm('appointment-id', 'other-therapist-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when appointment is not pending', async () => {
      const confirmedAppointment = { ...mockAppointment, status: AppointmentStatus.CONFIRMED };
      mockPrismaService.appointment.findUnique.mockResolvedValue(confirmedAppointment);

      await expect(service.confirm('appointment-id', 'therapist-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel appointment successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2); // 2 days from now
      const futureAppointment = { ...mockAppointment, scheduledAt: futureDate };

      mockPrismaService.appointment.findUnique.mockResolvedValue(futureAppointment);
      mockPrismaService.appointment.update.mockResolvedValue({
        ...futureAppointment,
        status: AppointmentStatus.CANCELLED,
      });

      const result = await service.cancel('appointment-id', 'user-id', 'Schedule conflict');

      expect(result.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('should throw NotFoundException when appointment not found', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(null);

      await expect(service.cancel('non-existent-id', 'user-id', 'reason')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);

      await expect(service.cancel('appointment-id', 'other-user-id', 'reason')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when appointment is already completed', async () => {
      const completedAppointment = { ...mockAppointment, status: AppointmentStatus.COMPLETED };
      mockPrismaService.appointment.findUnique.mockResolvedValue(completedAppointment);

      await expect(service.cancel('appointment-id', 'user-id', 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when appointment is already cancelled', async () => {
      const cancelledAppointment = { ...mockAppointment, status: AppointmentStatus.CANCELLED };
      mockPrismaService.appointment.findUnique.mockResolvedValue(cancelledAppointment);

      await expect(service.cancel('appointment-id', 'user-id', 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow therapist to cancel', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const futureAppointment = { ...mockAppointment, scheduledAt: futureDate };

      mockPrismaService.appointment.findUnique.mockResolvedValue(futureAppointment);
      mockPrismaService.appointment.update.mockResolvedValue({
        ...futureAppointment,
        status: AppointmentStatus.CANCELLED,
      });

      const result = await service.cancel('appointment-id', 'therapist-id', 'Emergency', true);

      expect(result.status).toBe(AppointmentStatus.CANCELLED);
    });
  });

  describe('complete', () => {
    it('should complete appointment successfully', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrismaService.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: AppointmentStatus.COMPLETED,
      });

      const result = await service.complete('appointment-id', 'therapist-id', 'Session notes');

      expect(result.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('should throw NotFoundException when appointment not found', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(null);

      await expect(service.complete('non-existent-id', 'therapist-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not authorized', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);

      await expect(service.complete('appointment-id', 'other-therapist-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addReview', () => {
    const reviewData = {
      rating: 5,
      feedback: 'Great session!',
      tags: ['Professional', 'Helpful'],
      isAnonymous: false,
    };

    it('should add review successfully', async () => {
      const completedAppointment = { ...mockAppointment, status: AppointmentStatus.COMPLETED };
      mockPrismaService.appointment.findUnique.mockResolvedValue(completedAppointment);
      mockPrismaService.review.create.mockResolvedValue({
        id: 'review-id',
        ...reviewData,
        userId: 'user-id',
        therapistId: 'therapist-id',
        appointmentId: 'appointment-id',
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: 10,
      });
      mockPrismaService.therapist.update.mockResolvedValue({});

      const result = await service.addReview('appointment-id', 'user-id', reviewData);

      expect(result.rating).toBe(5);
      expect(mockPrismaService.therapist.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when appointment not found', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(null);

      await expect(service.addReview('non-existent-id', 'user-id', reviewData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not the appointment owner', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);

      await expect(service.addReview('appointment-id', 'other-user-id', reviewData)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when appointment is not completed', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);

      await expect(service.addReview('appointment-id', 'user-id', reviewData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
