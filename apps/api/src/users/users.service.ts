import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UserStatus, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        timezone: true,
        preferredLanguage: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(id: string, data: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    bio?: string;
    timezone?: string;
    preferredLanguage?: string;
  }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        timezone: true,
        preferredLanguage: true,
      },
    });
  }

  async updateAvatar(id: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
    });
  }

  async uploadAvatar(
    userId: string,
    base64: string,
    mimeType: string,
  ): Promise<{ avatarUrl: string }> {
    // Get the user to verify they exist
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Upload to Firebase Firestore (handles size validation internally)
      const avatarUrl = await this.firebaseService.uploadAvatar(
        base64,
        userId,
        mimeType === 'image/heic' ? 'image/jpeg' : mimeType, // HEIC converted to JPEG on client
      );

      // Update user avatar URL in database
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
      });

      return { avatarUrl };
    } catch (error) {
      console.error('Avatar upload failed:', error.message);
      throw new BadRequestException(error.message || 'Failed to upload avatar');
    }
  }

  async findAll(options: { page?: number; limit?: number; search?: string; status?: string; role?: string }) {
    const { page = 1, limit = 20, search, status, role } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (role) where.role = role;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, phone: true, role: true, status: true,
          firstName: true, lastName: true, avatarUrl: true,
          emailVerified: true, phoneVerified: true,
          createdAt: true, lastLoginAt: true,
          _count: { select: { appointments: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateStatus(id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN) throw new ForbiddenException('Cannot modify admin status');
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN) throw new ForbiddenException('Cannot delete admin users');
    return this.prisma.user.delete({ where: { id } });
  }

  async removeAvatar(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete from Firestore
    try {
      await this.firebaseService.deleteAvatar(userId);
    } catch (error) {
      console.warn('Failed to delete avatar from Firestore:', error);
    }

    // Clear avatar URL in database
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });
  }
}
