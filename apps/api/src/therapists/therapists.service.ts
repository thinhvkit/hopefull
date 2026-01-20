import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TherapistVerificationStatus, Prisma } from '@prisma/client';

@Injectable()
export class TherapistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    specialization?: string;
    language?: string;
    minRating?: number;
    maxPrice?: number;
    isOnline?: boolean;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      specialization,
      language,
      minRating,
      maxPrice,
      isOnline,
    } = options;

    const where: Prisma.TherapistWhereInput = {
      verificationStatus: TherapistVerificationStatus.APPROVED,
      user: { status: 'ACTIVE' },
    };

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { professionalTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (specialization) {
      where.specializations = {
        some: { specialization: { name: specialization } },
      };
    }

    if (language) {
      where.languages = {
        some: { language },
      };
    }

    if (minRating) {
      where.averageRating = { gte: minRating };
    }

    if (maxPrice) {
      where.hourlyRate = { lte: maxPrice };
    }

    if (isOnline !== undefined) {
      where.isOnline = isOnline;
    }

    const [therapists, total] = await Promise.all([
      this.prisma.therapist.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          languages: true,
          specializations: {
            include: { specialization: true },
          },
        },
        orderBy: [{ isOnline: 'desc' }, { averageRating: 'desc' }],
      }),
      this.prisma.therapist.count({ where }),
    ]);

    return {
      data: therapists,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            bio: true,
          },
        },
        languages: true,
        specializations: {
          include: { specialization: true },
        },
        licenses: {
          where: { verified: true },
        },
        availabilities: {
          where: { isActive: true },
        },
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    return therapist;
  }

  async getAvailableSlots(therapistId: string, date: string) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
      include: {
        availabilities: { where: { isActive: true } },
        blockedSlots: true,
        appointments: {
          where: {
            scheduledAt: {
              gte: new Date(date),
              lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
            },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        },
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    // Calculate available slots based on availabilities, blocked slots, and existing appointments
    const dayOfWeek = new Date(date).getDay();
    const dayAvailability = therapist.availabilities.filter(
      (a) => a.dayOfWeek === dayOfWeek,
    );

    // Generate 30-minute time slots from availability ranges
    const slots: { startTime: string; endTime: string }[] = [];
    const slotDuration = 30; // 30 minutes per slot

    for (const availability of dayAvailability) {
      const [startHour, startMin] = availability.startTime.split(':').map(Number);
      const [endHour, endMin] = availability.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMin = startMin;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMin < endMin)
      ) {
        const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

        // Calculate end time of this slot
        let endSlotMin = currentMin + slotDuration;
        let endSlotHour = currentHour;
        if (endSlotMin >= 60) {
          endSlotMin -= 60;
          endSlotHour += 1;
        }

        // Don't add slot if it exceeds the availability end time
        if (
          endSlotHour > endHour ||
          (endSlotHour === endHour && endSlotMin > endMin)
        ) {
          break;
        }

        const endTime = `${String(endSlotHour).padStart(2, '0')}:${String(endSlotMin).padStart(2, '0')}`;

        slots.push({ startTime, endTime });

        // Move to next slot
        currentMin += slotDuration;
        if (currentMin >= 60) {
          currentMin -= 60;
          currentHour += 1;
        }
      }
    }

    // Filter out slots that are already booked
    const bookedSlots = therapist.appointments.map((a) => {
      const appointmentDate = new Date(a.scheduledAt);
      return {
        startTime: `${String(appointmentDate.getHours()).padStart(2, '0')}:${String(appointmentDate.getMinutes()).padStart(2, '0')}`,
        duration: a.duration,
      };
    });

    // Remove booked time slots
    const availableSlots = slots.filter((slot) => {
      const slotStart = slot.startTime;
      return !bookedSlots.some((booked) => booked.startTime === slotStart);
    });

    return {
      date,
      slots: availableSlots,
      bookedSlots: bookedSlots.map((b) => ({
        startTime: b.startTime,
        duration: b.duration,
      })),
    };
  }

  async updateOnlineStatus(therapistId: string, isOnline: boolean) {
    return this.prisma.therapist.update({
      where: { id: therapistId },
      data: { isOnline },
    });
  }

  async getReviews(therapistId: string, page = 1, limit = 10) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { therapistId },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { therapistId } }),
    ]);

    return {
      data: reviews.map((r) => ({
        ...r,
        user: r.isAnonymous ? null : r.user,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
