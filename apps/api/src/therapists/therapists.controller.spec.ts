import { Test, TestingModule } from '@nestjs/testing';
import { TherapistsController } from './therapists.controller';
import { TherapistsService } from './therapists.service';

describe('TherapistsController', () => {
  let controller: TherapistsController;
  let therapistsService: TherapistsService;

  const mockTherapistsService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    getAvailableSlots: jest.fn(),
    getReviews: jest.fn(),
    updateOnlineStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TherapistsController],
      providers: [{ provide: TherapistsService, useValue: mockTherapistsService }],
    }).compile();

    controller = module.get<TherapistsController>(TherapistsController);
    therapistsService = module.get<TherapistsService>(TherapistsService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated list of therapists', async () => {
      const expectedResult = {
        data: [{ id: 'therapist-id' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockTherapistsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
    });

    it('should pass query parameters to service', async () => {
      mockTherapistsService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll('2', '10', 'John', 'Anxiety', 'English', '4', '15000', 'true');

      expect(therapistsService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'John',
        specialization: 'Anxiety',
        language: 'English',
        minRating: 4,
        maxPrice: 15000,
        isOnline: true,
      });
    });

    it('should handle undefined query parameters', async () => {
      mockTherapistsService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);

      expect(therapistsService.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        search: undefined,
        specialization: undefined,
        language: undefined,
        minRating: undefined,
        maxPrice: undefined,
        isOnline: undefined,
      });
    });
  });

  describe('findById', () => {
    it('should return therapist by id', async () => {
      const expectedResult = { id: 'therapist-id', name: 'Dr. John' };
      mockTherapistsService.findById.mockResolvedValue(expectedResult);

      const result = await controller.findById('therapist-id');

      expect(result).toEqual(expectedResult);
      expect(therapistsService.findById).toHaveBeenCalledWith('therapist-id');
    });
  });

  describe('getAvailability', () => {
    it('should return available slots for a date', async () => {
      const expectedResult = {
        date: '2024-01-10',
        slots: [{ startTime: '09:00', endTime: '10:00' }],
        bookedSlots: [],
      };
      mockTherapistsService.getAvailableSlots.mockResolvedValue(expectedResult);

      const result = await controller.getAvailability('therapist-id', '2024-01-10');

      expect(result).toEqual(expectedResult);
      expect(therapistsService.getAvailableSlots).toHaveBeenCalledWith('therapist-id', '2024-01-10');
    });
  });

  describe('getReviews', () => {
    it('should return paginated reviews', async () => {
      const expectedResult = {
        data: [{ id: 'review-id', rating: 5 }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockTherapistsService.getReviews.mockResolvedValue(expectedResult);

      const result = await controller.getReviews('therapist-id');

      expect(result).toEqual(expectedResult);
    });

    it('should pass pagination parameters', async () => {
      mockTherapistsService.getReviews.mockResolvedValue({ data: [], meta: {} });

      await controller.getReviews('therapist-id', '2', '5');

      expect(therapistsService.getReviews).toHaveBeenCalledWith('therapist-id', 2, 5);
    });
  });

  describe('updateStatus', () => {
    it('should update online status to true', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      mockTherapistsService.updateOnlineStatus.mockResolvedValue({ isOnline: true });

      const result = await controller.updateStatus(mockRequest, 'true');

      expect(result.isOnline).toBe(true);
      expect(therapistsService.updateOnlineStatus).toHaveBeenCalledWith('user-id', true);
    });

    it('should update online status to false', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      mockTherapistsService.updateOnlineStatus.mockResolvedValue({ isOnline: false });

      const result = await controller.updateStatus(mockRequest, 'false');

      expect(result.isOnline).toBe(false);
      expect(therapistsService.updateOnlineStatus).toHaveBeenCalledWith('user-id', false);
    });
  });
});
