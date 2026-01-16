import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: PaymentsService;

  const mockPaymentsService = {
    getPaymentMethods: jest.fn(),
    addPaymentMethod: jest.fn(),
    setDefaultPaymentMethod: jest.fn(),
    deletePaymentMethod: jest.fn(),
    getPaymentHistory: jest.fn(),
  };

  const mockPaymentMethod = {
    id: 'pm-id',
    userId: 'user-id',
    stripePaymentMethodId: 'pm_stripe_123',
    type: 'card',
    brand: 'visa',
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2025,
    isDefault: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get<PaymentsService>(PaymentsService);

    jest.clearAllMocks();
  });

  describe('getPaymentMethods', () => {
    it('should return payment methods for user', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      mockPaymentsService.getPaymentMethods.mockResolvedValue([mockPaymentMethod]);

      const result = await controller.getPaymentMethods(mockRequest);

      expect(result).toHaveLength(1);
      expect(paymentsService.getPaymentMethods).toHaveBeenCalledWith('user-id');
    });
  });

  describe('addPaymentMethod', () => {
    it('should add payment method successfully', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const body = {
        stripePaymentMethodId: 'pm_stripe_123',
        type: 'card',
        brand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true,
      };
      mockPaymentsService.addPaymentMethod.mockResolvedValue(mockPaymentMethod);

      const result = await controller.addPaymentMethod(mockRequest, body);

      expect(result).toEqual(mockPaymentMethod);
      expect(paymentsService.addPaymentMethod).toHaveBeenCalledWith('user-id', body);
    });

    it('should add payment method with minimal data', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const body = {
        stripePaymentMethodId: 'pm_stripe_123',
        type: 'card',
      };
      mockPaymentsService.addPaymentMethod.mockResolvedValue({
        id: 'pm-id',
        ...body,
        isDefault: false,
      });

      await controller.addPaymentMethod(mockRequest, body);

      expect(paymentsService.addPaymentMethod).toHaveBeenCalledWith('user-id', body);
    });
  });

  describe('setDefault', () => {
    it('should set payment method as default', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      mockPaymentsService.setDefaultPaymentMethod.mockResolvedValue({
        ...mockPaymentMethod,
        isDefault: true,
      });

      const result = await controller.setDefault(mockRequest, 'pm-id');

      expect(result.isDefault).toBe(true);
      expect(paymentsService.setDefaultPaymentMethod).toHaveBeenCalledWith('user-id', 'pm-id');
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete payment method successfully', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      mockPaymentsService.deletePaymentMethod.mockResolvedValue({ success: true });

      const result = await controller.deletePaymentMethod(mockRequest, 'pm-id');

      expect(result).toEqual({ success: true });
      expect(paymentsService.deletePaymentMethod).toHaveBeenCalledWith('user-id', 'pm-id');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history with default pagination', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      const expectedResult = {
        data: [{ id: 'payment-id', amount: 10000 }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockPaymentsService.getPaymentHistory.mockResolvedValue(expectedResult);

      const result = await controller.getPaymentHistory(mockRequest);

      expect(result).toEqual(expectedResult);
      expect(paymentsService.getPaymentHistory).toHaveBeenCalledWith('user-id', undefined, undefined);
    });

    it('should pass pagination parameters', async () => {
      const mockRequest = { user: { id: 'user-id' } };
      mockPaymentsService.getPaymentHistory.mockResolvedValue({
        data: [],
        meta: { total: 50, page: 2, limit: 10, totalPages: 5 },
      });

      await controller.getPaymentHistory(mockRequest, '2', '10');

      expect(paymentsService.getPaymentHistory).toHaveBeenCalledWith('user-id', 2, 10);
    });
  });
});
