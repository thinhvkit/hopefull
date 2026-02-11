import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';
import { NotificationType } from '@prisma/client';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

interface SendPushNotificationParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  async findAll(userId: string, page = 1, limit = 20) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async delete(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async create(params: SendNotificationParams) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data,
      },
    });

    // Send push notification
    await this.sendPushNotification({
      userId: params.userId,
      title: params.title,
      body: params.message,
      data: {
        notificationId: notification.id,
        type: params.type,
        ...(params.data ? this.stringifyData(params.data) : {}),
      },
    });

    return notification;
  }

  private stringifyData(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }

  async sendPushNotification(params: SendPushNotificationParams) {
    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { userId: params.userId },
    });

    if (deviceTokens.length === 0) {
      console.log(`No device tokens found for user ${params.userId}`);
      return;
    }

    const tokens = deviceTokens.map((dt) => dt.token);

    try {
      const messaging = this.firebaseService.getMessaging();
      const unreadCount = await this.getUnreadCount(params.userId);

      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: params.title,
          body: params.body,
        },
        data: {
          ...params.data,
          badgeCount: String(unreadCount), // Include badge count in data for all platforms
        },
        apns: {
          payload: {
            aps: {
              badge: unreadCount,
              sound: 'default',
            },
          },
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
            notificationCount: unreadCount, // Android notification count
          },
        },
      });

      // Handle failed tokens (remove invalid ones)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp: { success: boolean; error?: { message: string } }, idx: number) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            console.error(`Failed to send to token: ${resp.error?.message}`);
          }
        });

        // Remove invalid tokens
        if (failedTokens.length > 0) {
          await this.prisma.deviceToken.deleteMany({
            where: { token: { in: failedTokens } },
          });
        }
      }

      console.log(`Push sent: ${response.successCount} success, ${response.failureCount} failed`);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Device token management
  async registerDeviceToken(userId: string, token: string, platform: string) {
    // Upsert: update if exists, create if not
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, updatedAt: new Date() },
      create: { userId, token, platform },
    });
  }

  async removeDeviceToken(token: string) {
    return this.prisma.deviceToken.deleteMany({
      where: { token },
    });
  }

  async removeAllDeviceTokens(userId: string) {
    return this.prisma.deviceToken.deleteMany({
      where: { userId },
    });
  }

  // Helper methods for sending specific notification types
  async sendBookingConfirmation(userId: string, appointmentId: string, therapistName: string, dateTime: string) {
    return this.create({
      userId,
      type: 'BOOKING_CONFIRMATION',
      title: 'Booking Confirmed',
      message: `Your appointment with ${therapistName} on ${dateTime} has been confirmed.`,
      data: { appointmentId, screen: 'appointment-details' },
    });
  }

  async sendAppointmentReminder(userId: string, appointmentId: string, therapistName: string, minutesUntil: number) {
    return this.create({
      userId,
      type: 'APPOINTMENT_REMINDER',
      title: 'Appointment Reminder',
      message: `Your session with ${therapistName} starts in ${minutesUntil} minutes.`,
      data: { appointmentId, screen: 'appointment-details' },
    });
  }

  async sendPaymentReceipt(userId: string, paymentId: string, amount: number) {
    const formattedAmount = (amount / 100).toFixed(2);
    return this.create({
      userId,
      type: 'PAYMENT_RECEIPT',
      title: 'Payment Received',
      message: `We've received your payment of $${formattedAmount}. Thank you!`,
      data: { paymentId, screen: 'payment-details' },
    });
  }

  async sendTherapistMessage(userId: string, therapistId: string, therapistName: string) {
    return this.create({
      userId,
      type: 'THERAPIST_MESSAGE',
      title: 'New Message',
      message: `${therapistName} sent you a message.`,
      data: { therapistId, screen: 'chat' },
    });
  }

  async sendSystemNotification(userId: string, title: string, message: string, data?: Record<string, any>) {
    return this.create({
      userId,
      type: 'SYSTEM',
      title,
      message,
      data,
    });
  }

  // Chat message - push only, no DB record
  async sendChatMessage(recipientId: string, senderName: string, appointmentId: string) {
    await this.sendPushNotification({
      userId: recipientId,
      title: 'New Message',
      body: `${senderName} sent you a message.`,
      data: {
        type: 'THERAPIST_MESSAGE',
        screen: 'chat',
        appointmentId,
      },
    });
  }

  // Booking Request - notify therapist of new booking request
  async sendBookingRequest(therapistUserId: string, appointmentId: string, patientName: string, dateTime: string) {
    return this.create({
      userId: therapistUserId,
      type: 'SYSTEM',
      title: 'New Booking Request',
      message: `${patientName} has requested an appointment on ${dateTime}. Please review and respond.`,
      data: { appointmentId, screen: 'appointment-details' },
    });
  }

  // Booking Declined - notify patient that therapist declined
  async sendBookingDeclined(userId: string, appointmentId: string, therapistName: string, reason?: string) {
    const message = reason
      ? `${therapistName} was unable to accept your booking request. Reason: ${reason}`
      : `${therapistName} was unable to accept your booking request. Please try another time slot.`;

    return this.create({
      userId,
      type: 'SYSTEM',
      title: 'Booking Not Available',
      message,
      data: { appointmentId, screen: 'appointment-details' },
    });
  }

  // Appointment Cancelled - notify the other party
  async sendAppointmentCancelled(
    userId: string,
    appointmentId: string,
    cancelledByName: string,
    dateTime: string,
    reason?: string
  ) {
    const message = reason
      ? `Your appointment on ${dateTime} has been cancelled by ${cancelledByName}. Reason: ${reason}`
      : `Your appointment on ${dateTime} has been cancelled by ${cancelledByName}.`;

    return this.create({
      userId,
      type: 'SYSTEM',
      title: 'Appointment Cancelled',
      message,
      data: { appointmentId, screen: 'appointment-details' },
    });
  }
}
