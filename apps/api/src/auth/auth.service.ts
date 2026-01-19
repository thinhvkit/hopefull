import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SocialAuthDto, SocialProvider } from './dto/social-auth.dto';
import { UserRole } from '@prisma/client';

const OTP_EXPIRY_MINUTES = 3;
const MAX_OTP_ATTEMPTS = 3;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check phone if provided
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Validate password strength
    this.validatePassword(dto.password);

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role || UserRole.USER,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Send OTP via SMS if phone provided, otherwise via email
    if (user.phone) {
      await this.sendOtpToUser(user.id, user.phone, 'SMS', 'VERIFICATION');
    } else {
      await this.sendOtpToUser(user.id, user.email, 'EMAIL', 'VERIFICATION');
    }

    return {
      user,
      requiresVerification: true,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if phone verification is required
    if (user.phone && !user.phoneVerified) {
      // Send new OTP for verification
      await this.sendOtpToUser(user.id, user.phone, 'SMS', 'VERIFICATION');

      return {
        requiresVerification: true,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.generateTokens(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user.id, user.role);
  }

  async sendOtp(email: string, purpose: string = 'VERIFICATION') {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const destination = user.phone || user.email;
    const type = user.phone ? 'SMS' : 'EMAIL';

    return this.sendOtpToUser(user.id, destination, type, purpose);
  }

  private async sendOtpToUser(
    userId: string,
    destination: string,
    type: 'SMS' | 'EMAIL',
    purpose: string,
  ) {
    // Delete any existing OTPs for this user and purpose
    await this.prisma.otpCode.deleteMany({
      where: {
        userId,
        purpose,
      },
    });

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Create OTP record
    await this.prisma.otpCode.create({
      data: {
        userId,
        code,
        type,
        purpose,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    if (type === 'SMS') {
      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log(`[DEV] SMS OTP for ${destination}: ${code}`);
    } else {
      // TODO: Integrate with email service (SendGrid, SES, etc.)
      console.log(`[DEV] Email OTP for ${destination}: ${code}`);
    }

    return { message: `OTP sent via ${type}` };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('No OTP found. Please request a new one.');
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Please request a new OTP.');
    }

    if (otpRecord.code !== dto.otp) {
      // Increment attempts
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Mark OTP as verified
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Mark email as verified if purpose was VERIFICATION
    if (otpRecord.purpose === 'VERIFICATION') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    }

    // Generate tokens for the user
    const tokens = this.generateTokens(user.id, user.role);

    return {
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    return this.sendOtp(dto.email, 'VERIFICATION');
  }

  async verifyPhone(dto: VerifyPhoneDto) {
    // Verify Firebase ID token
    const decodedToken = await this.firebaseService.verifyIdToken(dto.idToken);

    if (!decodedToken.phone_number) {
      throw new BadRequestException('Phone number not found in token');
    }

    const phoneNumber = decodedToken.phone_number;

    // Check if user exists with this phone number
    let user = await this.prisma.user.findUnique({
      where: { phone: phoneNumber },
    });

    if (dto.userId) {
      // Link phone to existing user (after registration)
      const existingUser = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!existingUser) {
        throw new BadRequestException('User not found');
      }

      // Update user with verified phone
      user = await this.prisma.user.update({
        where: { id: dto.userId },
        data: {
          phone: phoneNumber,
          phoneVerified: true,
        },
      });
    } else if (!user) {
      // Create new user with phone (phone-only registration)
      user = await this.prisma.user.create({
        data: {
          email: `${phoneNumber.replace(/\+/g, '')}@phone.local`, // Placeholder email
          phone: phoneNumber,
          phoneVerified: true,
          role: UserRole.USER,
        },
      });
    } else {
      // Existing user logging in with phone
      await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.role);

    return {
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    // Verify Firebase ID token
    const decodedToken = await this.firebaseService.verifyIdToken(dto.idToken);

    if (!decodedToken.email) {
      throw new BadRequestException('Email not found in token');
    }

    const email = decodedToken.email;

    // Check if user exists with this email
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (dto.userId) {
      // Link email verification to existing user (after registration)
      const existingUser = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!existingUser) {
        throw new BadRequestException('User not found');
      }

      // Update user with verified email
      user = await this.prisma.user.update({
        where: { id: dto.userId },
        data: {
          emailVerified: true,
        },
      });
    } else if (!user) {
      // Create new user with email (email-only registration via Firebase)
      user = await this.prisma.user.create({
        data: {
          email,
          emailVerified: true,
          role: UserRole.USER,
        },
      });
    } else {
      // Existing user verifying email
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.role);

    return {
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async socialAuth(dto: SocialAuthDto) {
    // Verify Firebase ID token
    const decodedToken = await this.firebaseService.verifyIdToken(dto.idToken);

    if (!decodedToken.email) {
      throw new BadRequestException('Email not found in social account');
    }

    const email = decodedToken.email;
    const firebaseUid = decodedToken.uid;

    // Check if user exists with this email
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user from social sign-in
      // Extract name from token or use provided names (Apple provides on first sign-in)
      const firstName =
        dto.firstName ||
        decodedToken.name?.split(' ')[0] ||
        decodedToken.given_name ||
        null;
      const lastName =
        dto.lastName ||
        decodedToken.name?.split(' ').slice(1).join(' ') ||
        decodedToken.family_name ||
        null;

      const createData: any = {
        email,
        emailVerified: true,
        firstName,
        lastName,
        avatarUrl: decodedToken.picture || null,
        role: UserRole.USER,
      };

      // Set provider-specific ID
      if (dto.provider === SocialProvider.GOOGLE) {
        createData.googleId = firebaseUid;
      } else if (dto.provider === SocialProvider.APPLE) {
        createData.appleId = firebaseUid;
      }

      user = await this.prisma.user.create({
        data: createData,
      });
    } else {
      // Existing user - link social account if not already linked
      const updateData: any = {
        emailVerified: true,
        lastLoginAt: new Date(),
      };

      // Link Google account if not already linked
      if (dto.provider === SocialProvider.GOOGLE && !user.googleId) {
        updateData.googleId = firebaseUid;
      }

      // Link Apple account if not already linked
      if (dto.provider === SocialProvider.APPLE && !user.appleId) {
        updateData.appleId = firebaseUid;
      }

      // Update avatar if not set
      if (!user.avatarUrl && decodedToken.picture) {
        updateData.avatarUrl = decodedToken.picture;
      }

      // Update name if not set (for Apple sign-in which provides name only on first sign-in)
      if (!user.firstName && (dto.firstName || decodedToken.given_name)) {
        updateData.firstName = dto.firstName || decodedToken.given_name;
      }
      if (!user.lastName && (dto.lastName || decodedToken.family_name)) {
        updateData.lastName = dto.lastName || decodedToken.family_name;
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.role);

    return {
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  private generateTokens(userId: string, role: UserRole) {
    const payload = { sub: userId, role };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, an OTP has been sent' };
    }

    // Send OTP for password reset
    await this.sendOtpToUser(user.id, user.email, 'EMAIL', 'PASSWORD_RESET');

    return { message: 'If the email exists, an OTP has been sent' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(dto.newPassword);

    // Check that new password is different from current
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Invalid request');
    }

    // Find the OTP record for password reset
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('No OTP found. Please request a new one.');
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Please request a new OTP.');
    }

    if (otpRecord.code !== dto.otp) {
      // Increment attempts
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Validate new password
    this.validatePassword(dto.newPassword);

    // Hash new password
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    // Update user password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Mark OTP as verified
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Delete all password reset OTPs for this user
    await this.prisma.otpCode.deleteMany({
      where: {
        userId: user.id,
        purpose: 'PASSWORD_RESET',
      },
    });

    return { message: 'Password reset successfully' };
  }

  private validatePassword(password: string) {
    if (password.length < 12) {
      throw new BadRequestException('Password must be at least 12 characters');
    }

    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain an uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain a lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain a number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new BadRequestException('Password must contain a special character');
    }
  }
}
