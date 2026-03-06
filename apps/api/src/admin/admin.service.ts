import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalTherapists,
      pendingVerifications,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      revenueToday,
      revenueWeek,
      revenueMonth,
      recentUsers,
      recentBookings,
      pendingTherapists,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.therapist.count({ where: { verificationStatus: 'APPROVED' } }),
      this.prisma.therapist.count({ where: { verificationStatus: 'PENDING_REVIEW' } }),
      this.prisma.appointment.count(),
      this.prisma.appointment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.appointment.count({ where: { status: 'CANCELLED' } }),
      this.prisma.appointment.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: startOfDay } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: startOfWeek } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      this.prisma.user.findMany({
        where: { role: 'USER' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
      }),
      this.prisma.appointment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { firstName: true, lastName: true } },
          therapist: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.therapist.findMany({
        where: { verificationStatus: 'PENDING_REVIEW' },
        take: 5,
        include: {
          user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
          specializations: { include: { specialization: true } },
        },
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalTherapists,
        pendingVerifications,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        pendingAppointments,
      },
      revenue: {
        today: revenueToday._sum.amount || 0,
        thisWeek: revenueWeek._sum.amount || 0,
        thisMonth: revenueMonth._sum.amount || 0,
      },
      recentUsers,
      recentBookings,
      pendingTherapists,
    };
  }

  async getSettings(): Promise<Record<string, string>> {
    const settings = await this.prisma.systemSetting.findMany();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  async updateSettings(data: Record<string, string>) {
    await Promise.all(
      Object.entries(data).map(([key, value]) =>
        this.prisma.systemSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
    return this.getSettings();
  }

  async getSupportTickets(options: { page?: number; limit?: number; search?: string; status?: string }) {
    const { page = 1, limit = 20, search, status } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateSupportTicket(id: string, data: { status?: string; assignedTo?: string }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...data,
        resolvedAt: data.status === 'RESOLVED' ? new Date() : undefined,
      },
    });
  }
}
