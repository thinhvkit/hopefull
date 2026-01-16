import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let appointmentsService: AppointmentsService;

  const mockAppointmentsService = {
    create: jest.fn(),
    findByUser: jest.fn(),
    findByTherapist: jest.fn(),
    findById: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    complete: jest.fn(),
    addReview: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [{ provide: AppointmentsService, useValue: mockAppointmentsService }],
    }).compile();

    controller = module.get<AppointmentsController>(AppointmentsController);
    appointmentsService = module.get<AppointmentsService>(AppointmentsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create appointment successfully', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const body = {
        therapistId: 'therapist-id',
        scheduledAt: '2024-01-15T10:00:00Z',
        duration: 60,
        timezone: 'UTC',
        amount: 10000,
        bookingNotes: 'First session',
      };
      mockAppointmentsService.create.mockResolvedValue(mockAppointment);

      const result = await controller.create(mockRequest, body);

      expect(result).toEqual(mockAppointment);
      expect(appointmentsService.create).toHaveBeenCalledWith({
        userId: 'user-id',
        therapistId: 'therapist-id',
        scheduledAt: expect.any(Date),
        duration: 60,
        timezone: 'UTC',
        bookingNotes: 'First session',
        amount: 10000,
      });
    });
  });

  describe('findByUser', () => {
    it('should return user appointments', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      mockAppointmentsService.findByUser.mockResolvedValue([mockAppointment]);

      const result = await controller.findByUser(mockRequest);

      expect(result).toHaveLength(1);
      expect(appointmentsService.findByUser).toHaveBeenCalledWith('user-id', undefined);
    });

    it('should filter by status', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      mockAppointmentsService.findByUser.mockResolvedValue([]);

      await controller.findByUser(mockRequest, 'upcoming');

      expect(appointmentsService.findByUser).toHaveBeenCalledWith('user-id', 'upcoming');
    });
  });

  describe('findByTherapist', () => {
    it('should return therapist appointments', async () => {
      const mockRequest = { user: { id: 'therapist-id' } };
      mockAppointmentsService.findByTherapist.mockResolvedValue([mockAppointment]);

      const result = await controller.findByTherapist(mockRequest);

      expect(result).toHaveLength(1);
      expect(appointmentsService.findByTherapist).toHaveBeenCalledWith('therapist-id', undefined);
    });

    it('should filter by status', async () => {
      const mockRequest = { user: { id: 'therapist-id' } };
      mockAppointmentsService.findByTherapist.mockResolvedValue([]);

      await controller.findByTherapist(mockRequest, 'past');

      expect(appointmentsService.findByTherapist).toHaveBeenCalledWith('therapist-id', 'past');
    });
  });

  describe('findById', () => {
    it('should return appointment by id', async () => {
      mockAppointmentsService.findById.mockResolvedValue(mockAppointment);

      const result = await controller.findById('appointment-id');

      expect(result).toEqual(mockAppointment);
      expect(appointmentsService.findById).toHaveBeenCalledWith('appointment-id');
    });
  });

  describe('confirm', () => {
    it('should confirm appointment successfully', async () => {
      const mockRequest = { user: { id: 'therapist-id' } };
      const confirmedAppointment = { ...mockAppointment, status: AppointmentStatus.CONFIRMED };
      mockAppointmentsService.confirm.mockResolvedValue(confirmedAppointment);

      const result = await controller.confirm(mockRequest, 'appointment-id');

      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
      expect(appointmentsService.confirm).toHaveBeenCalledWith('appointment-id', 'therapist-id');
    });
  });

  describe('cancel', () => {
    it('should cancel appointment successfully', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const cancelledAppointment = { ...mockAppointment, status: AppointmentStatus.CANCELLED };
      mockAppointmentsService.cancel.mockResolvedValue(cancelledAppointment);

      const result = await controller.cancel(mockRequest, 'appointment-id', {
        reason: 'Schedule conflict',
      });

      expect(result.status).toBe(AppointmentStatus.CANCELLED);
      expect(appointmentsService.cancel).toHaveBeenCalledWith(
        'appointment-id',
        'user-id',
        'Schedule conflict',
      );
    });
  });

  describe('complete', () => {
    it('should complete appointment successfully', async () => {
      const mockRequest = { user: { id: 'therapist-id' } };
      const completedAppointment = { ...mockAppointment, status: AppointmentStatus.COMPLETED };
      mockAppointmentsService.complete.mockResolvedValue(completedAppointment);

      const result = await controller.complete(mockRequest, 'appointment-id', {
        sessionNotes: 'Session went well',
      });

      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(appointmentsService.complete).toHaveBeenCalledWith(
        'appointment-id',
        'therapist-id',
        'Session went well',
      );
    });

    it('should complete appointment without session notes', async () => {
      const mockRequest = { user: { id: 'therapist-id' } };
      const completedAppointment = { ...mockAppointment, status: AppointmentStatus.COMPLETED };
      mockAppointmentsService.complete.mockResolvedValue(completedAppointment);

      await controller.complete(mockRequest, 'appointment-id', {});

      expect(appointmentsService.complete).toHaveBeenCalledWith(
        'appointment-id',
        'therapist-id',
        undefined,
      );
    });
  });

  describe('addReview', () => {
    it('should add review successfully', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const reviewData = {
        rating: 5,
        feedback: 'Great session!',
        tags: ['Professional'],
        isAnonymous: false,
      };
      const mockReview = {
        id: 'review-id',
        ...reviewData,
        userId: 'user-id',
        therapistId: 'therapist-id',
        appointmentId: 'appointment-id',
      };
      mockAppointmentsService.addReview.mockResolvedValue(mockReview);

      const result = await controller.addReview(mockRequest, 'appointment-id', reviewData);

      expect(result.rating).toBe(5);
      expect(appointmentsService.addReview).toHaveBeenCalledWith(
        'appointment-id',
        'user-id',
        reviewData,
      );
    });

    it('should add anonymous review', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const reviewData = {
        rating: 4,
        isAnonymous: true,
      };
      mockAppointmentsService.addReview.mockResolvedValue({ id: 'review-id', ...reviewData });

      await controller.addReview(mockRequest, 'appointment-id', reviewData);

      expect(appointmentsService.addReview).toHaveBeenCalledWith(
        'appointment-id',
        'user-id',
        reviewData,
      );
    });
  });
});
