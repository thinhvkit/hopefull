import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';

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
