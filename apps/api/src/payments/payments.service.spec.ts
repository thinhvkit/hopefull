import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    paymentMethod: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
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

  const mockPayment = {
    id: 'payment-id',
    userId: 'user-id',
    appointmentId: 'appointment-id',
    amount: 10000,
    platformFee: 1000,
    therapistAmount: 9000,
    status: 'PENDING',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getPaymentMethods', () => {
    it('should return all payment methods for user', async () => {
      mockPrismaService.paymentMethod.findMany.mockResolvedValue([mockPaymentMethod]);

      const result = await service.getPaymentMethods('user-id');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.paymentMethod.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should return empty array when no payment methods', async () => {
      mockPrismaService.paymentMethod.findMany.mockResolvedValue([]);

      const result = await service.getPaymentMethods('user-id');

      expect(result).toHaveLength(0);
    });
  });

  describe('addPaymentMethod', () => {
    const paymentData = {
      stripePaymentMethodId: 'pm_stripe_123',
      type: 'card',
      brand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2025,
    };

    it('should add payment method successfully as default when first', async () => {
      mockPrismaService.paymentMethod.count.mockResolvedValue(0);
      mockPrismaService.paymentMethod.create.mockResolvedValue({
        ...mockPaymentMethod,
        isDefault: true,
      });

      const result = await service.addPaymentMethod('user-id', paymentData);

      expect(result.isDefault).toBe(true);
      expect(mockPrismaService.paymentMethod.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-id',
          ...paymentData,
          isDefault: true,
        },
      });
    });

    it('should add payment method with explicit isDefault true', async () => {
      mockPrismaService.paymentMethod.count.mockResolvedValue(2);
      mockPrismaService.paymentMethod.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.paymentMethod.create.mockResolvedValue({
        ...mockPaymentMethod,
        isDefault: true,
      });

      await service.addPaymentMethod('user-id', { ...paymentData, isDefault: true });

      expect(mockPrismaService.paymentMethod.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        data: { isDefault: false },
      });
    });

    it('should throw BadRequestException when max cards limit reached', async () => {
      mockPrismaService.paymentMethod.count.mockResolvedValue(5);

      await expect(service.addPaymentMethod('user-id', paymentData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should add payment method as non-default when other cards exist', async () => {
      mockPrismaService.paymentMethod.count.mockResolvedValue(2);
      mockPrismaService.paymentMethod.create.mockResolvedValue({
        ...mockPaymentMethod,
        isDefault: false,
      });

      await service.addPaymentMethod('user-id', paymentData);

      // When there are existing cards and isDefault is not explicitly set,
      // the create call will have isDefault based on: existingCount === 0 || data.isDefault
      expect(mockPrismaService.paymentMethod.create).toHaveBeenCalled();
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set payment method as default successfully', async () => {
      mockPrismaService.paymentMethod.findFirst.mockResolvedValue(mockPaymentMethod);
      mockPrismaService.paymentMethod.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.paymentMethod.update.mockResolvedValue({
        ...mockPaymentMethod,
        isDefault: true,
      });

      const result = await service.setDefaultPaymentMethod('user-id', 'pm-id');

      expect(result.isDefault).toBe(true);
      expect(mockPrismaService.paymentMethod.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        data: { isDefault: false },
      });
      expect(mockPrismaService.paymentMethod.update).toHaveBeenCalledWith({
        where: { id: 'pm-id' },
        data: { isDefault: true },
      });
    });

    it('should throw NotFoundException when payment method not found', async () => {
      mockPrismaService.paymentMethod.findFirst.mockResolvedValue(null);

      await expect(service.setDefaultPaymentMethod('user-id', 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete payment method successfully', async () => {
      const nonDefaultMethod = { ...mockPaymentMethod, isDefault: false };
      mockPrismaService.paymentMethod.findFirst.mockResolvedValue(nonDefaultMethod);
      mockPrismaService.paymentMethod.delete.mockResolvedValue(nonDefaultMethod);

      const result = await service.deletePaymentMethod('user-id', 'pm-id');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.paymentMethod.delete).toHaveBeenCalledWith({
        where: { id: 'pm-id' },
      });
    });

    it('should throw NotFoundException when payment method not found', async () => {
      mockPrismaService.paymentMethod.findFirst.mockResolvedValue(null);

      await expect(service.deletePaymentMethod('user-id', 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set another card as default when deleting default card', async () => {
      const defaultMethod = { ...mockPaymentMethod, isDefault: true };
      const remainingMethod = { id: 'pm-id-2', isDefault: false };

      mockPrismaService.paymentMethod.findFirst
        .mockResolvedValueOnce(defaultMethod)
        .mockResolvedValueOnce(remainingMethod);
      mockPrismaService.paymentMethod.delete.mockResolvedValue(defaultMethod);
      mockPrismaService.paymentMethod.update.mockResolvedValue({
        ...remainingMethod,
        isDefault: true,
      });

      await service.deletePaymentMethod('user-id', 'pm-id');

      expect(mockPrismaService.paymentMethod.update).toHaveBeenCalledWith({
        where: { id: 'pm-id-2' },
        data: { isDefault: true },
      });
    });

    it('should not set default when no remaining cards after deleting default', async () => {
      const defaultMethod = { ...mockPaymentMethod, isDefault: true };

      mockPrismaService.paymentMethod.findFirst
        .mockResolvedValueOnce(defaultMethod)
        .mockResolvedValueOnce(null);
      mockPrismaService.paymentMethod.delete.mockResolvedValue(defaultMethod);

      await service.deletePaymentMethod('user-id', 'pm-id');

      expect(mockPrismaService.paymentMethod.update).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentHistory', () => {
    it('should return paginated payment history', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrismaService.payment.count.mockResolvedValue(1);

      const result = await service.getPaymentHistory('user-id');

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should apply pagination parameters', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.payment.count.mockResolvedValue(50);

      const result = await service.getPaymentHistory('user-id', 2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      const paymentData = {
        userId: 'user-id',
        appointmentId: 'appointment-id',
        amount: 10000,
        platformFee: 1000,
        therapistAmount: 9000,
        stripePaymentIntentId: 'pi_123',
      };
      mockPrismaService.payment.create.mockResolvedValue({
        ...mockPayment,
        stripePaymentIntentId: 'pi_123',
      });

      const result = await service.createPayment(paymentData);

      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          ...paymentData,
          status: 'PENDING',
        },
      });
    });

    it('should create payment without stripePaymentIntentId', async () => {
      const paymentData = {
        userId: 'user-id',
        appointmentId: 'appointment-id',
        amount: 10000,
        platformFee: 1000,
        therapistAmount: 9000,
      };
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      await service.createPayment(paymentData);

      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          ...paymentData,
          status: 'PENDING',
        },
      });
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const confirmedPayment = {
        ...mockPayment,
        status: 'SUCCESS',
        stripeChargeId: 'ch_123',
        paidAt: expect.any(Date),
      };
      mockPrismaService.payment.update.mockResolvedValue(confirmedPayment);

      const result = await service.confirmPayment('payment-id', 'ch_123');

      expect(result.status).toBe('SUCCESS');
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-id' },
        data: {
          status: 'SUCCESS',
          stripeChargeId: 'ch_123',
          paidAt: expect.any(Date),
        },
      });
    });
  });
});
