import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2026-02-25.clover',
    });
  }

  async createSetupIntent(userId: string): Promise<{ clientSecret: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const setupIntent = await this.stripe.setupIntents.create({
      payment_method_types: ['card'],
      metadata: { userId },
    });

    return { clientSecret: setupIntent.client_secret! };
  }

  async verifyCard(userId: string, paymentMethodId: string): Promise<{ verified: boolean }> {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId },
    });
    if (!paymentMethod) throw new NotFoundException('Payment method not found');

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: 1, // $0.01
        currency: 'usd',
        payment_method: paymentMethod.stripePaymentMethodId,
        confirm: true,
        capture_method: 'manual',
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      });

      if (paymentIntent.status === 'requires_capture') {
        await this.stripe.paymentIntents.cancel(paymentIntent.id);
      }

      await this.prisma.paymentMethod.update({
        where: { id: paymentMethodId },
        data: { isVerified: true },
      });

      return { verified: true };
    } catch {
      await this.prisma.paymentMethod.update({
        where: { id: paymentMethodId },
        data: { isVerified: false },
      });
      return { verified: false };
    }
  }

  async getPaymentMethods(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addPaymentMethod(
    userId: string,
    data: {
      stripePaymentMethodId: string;
      type: string;
      brand?: string;
      last4?: string;
      expiryMonth?: number;
      expiryYear?: number;
      isDefault?: boolean;
    },
  ) {
    // Check max cards limit
    const existingCount = await this.prisma.paymentMethod.count({
      where: { userId },
    });

    if (existingCount >= 5) {
      throw new BadRequestException('Maximum 5 payment methods allowed');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // If first card, make it default
    const isDefault = existingCount === 0 || data.isDefault;

    return this.prisma.paymentMethod.create({
      data: {
        userId,
        stripePaymentMethodId: data.stripePaymentMethodId,
        type: data.type,
        brand: data.brand,
        last4: data.last4,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        isDefault,
      },
    });
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Unset all defaults
    await this.prisma.paymentMethod.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });
  }

  async deletePaymentMethod(userId: string, paymentMethodId: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    await this.prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });

    // If deleted was default, set another as default
    if (paymentMethod.isDefault) {
      const remaining = await this.prisma.paymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (remaining) {
        await this.prisma.paymentMethod.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true };
  }

  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          appointment: {
            include: {
              therapist: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllPayments(options: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string }) {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [data, total, summary] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          appointment: { include: { therapist: { include: { user: { select: { firstName: true, lastName: true } } } } } },
        },
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({
        where: { ...where, status: 'SUCCESS' },
        _sum: { amount: true, platformFee: true, therapistAmount: true },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary: {
        totalRevenue: summary._sum.amount || 0,
        totalPlatformFee: summary._sum.platformFee || 0,
        totalTherapistPayout: summary._sum.therapistAmount || 0,
      },
    };
  }

  async createPayment(data: {
    userId: string;
    appointmentId: string;
    amount: number;
    platformFee: number;
    therapistAmount: number;
    stripePaymentIntentId?: string;
  }) {
    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        appointmentId: data.appointmentId,
        amount: data.amount,
        platformFee: data.platformFee,
        therapistAmount: data.therapistAmount,
        stripePaymentIntentId: data.stripePaymentIntentId,
        status: 'PENDING',
      },
    });
  }

  async confirmPayment(paymentId: string, stripeChargeId: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        stripeChargeId,
        paidAt: new Date(),
      },
    });
  }
}
