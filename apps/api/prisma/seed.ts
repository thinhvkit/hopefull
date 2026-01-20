import { PrismaClient, AppointmentStatus, UserRole, TherapistVerificationStatus, PaymentStatus, LanguageProficiency } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data (in reverse order of dependencies)
  console.log('Clearing existing data...');
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointmentReminder.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.therapistBlockedSlot.deleteMany();
  await prisma.therapistAvailability.deleteMany();
  await prisma.therapistLicense.deleteMany();
  await prisma.therapistSpecialization.deleteMany();
  await prisma.therapistLanguage.deleteMany();
  await prisma.payoutSettings.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.therapist.deleteMany();
  await prisma.specialization.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.passwordHistory.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();

  // Create password hash
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ============================================
  // CREATE SPECIALIZATIONS
  // ============================================
  console.log('Creating specializations...');
  const specializations = await Promise.all([
    prisma.specialization.create({
      data: { name: 'Anxiety', description: 'Help with anxiety disorders and panic attacks', icon: 'brain', sortOrder: 1 },
    }),
    prisma.specialization.create({
      data: { name: 'Depression', description: 'Support for depression and mood disorders', icon: 'heart', sortOrder: 2 },
    }),
    prisma.specialization.create({
      data: { name: 'Relationships', description: 'Relationship counseling and interpersonal issues', icon: 'people', sortOrder: 3 },
    }),
    prisma.specialization.create({
      data: { name: 'Trauma', description: 'PTSD and trauma recovery', icon: 'shield', sortOrder: 4 },
    }),
    prisma.specialization.create({
      data: { name: 'Stress', description: 'Stress management and burnout prevention', icon: 'flash', sortOrder: 5 },
    }),
    prisma.specialization.create({
      data: { name: 'Addiction', description: 'Substance abuse and addiction recovery', icon: 'medical', sortOrder: 6 },
    }),
  ]);

  // ============================================
  // CREATE TEST USERS (PATIENTS)
  // ============================================
  console.log('Creating test users...');
  const testUser = await prisma.user.create({
    data: {
      email: 'patient@test.com',
      phone: '+1234567890',
      passwordHash,
      role: UserRole.USER,
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John D.',
      emailVerified: true,
      phoneVerified: true,
      timezone: 'America/New_York',
      bio: 'Looking for help with anxiety and stress management.',
    },
  });

  const testUser2 = await prisma.user.create({
    data: {
      email: 'patient2@test.com',
      phone: '+1234567891',
      passwordHash,
      role: UserRole.USER,
      firstName: 'Jane',
      lastName: 'Smith',
      displayName: 'Jane S.',
      emailVerified: true,
      phoneVerified: true,
      timezone: 'America/Los_Angeles',
    },
  });

  // ============================================
  // CREATE THERAPIST USERS
  // ============================================
  console.log('Creating therapists...');

  // Therapist 1: Dr. Sarah Johnson
  const therapistUser1 = await prisma.user.create({
    data: {
      email: 'dr.sarah@test.com',
      phone: '+1555000001',
      passwordHash,
      role: UserRole.THERAPIST,
      firstName: 'Sarah',
      lastName: 'Johnson',
      displayName: 'Dr. Sarah Johnson',
      avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      emailVerified: true,
      phoneVerified: true,
      timezone: 'America/New_York',
      bio: 'Licensed clinical psychologist with 10+ years of experience specializing in anxiety, depression, and trauma.',
    },
  });

  const therapist1 = await prisma.therapist.create({
    data: {
      userId: therapistUser1.id,
      professionalTitle: 'Licensed Clinical Psychologist',
      yearsOfExperience: 12,
      city: 'New York',
      state: 'NY',
      country: 'USA',
      verificationStatus: TherapistVerificationStatus.APPROVED,
      verifiedAt: new Date(),
      isOnline: true,
      hourlyRate: 15000, // $150
      thirtyMinRate: 8000, // $80
      sixtyMinRate: 15000, // $150
      ninetyMinRate: 20000, // $200
      averageRating: 4.8,
      totalReviews: 156,
      totalBookings: 423,
    },
  });

  // Add languages for therapist 1
  await prisma.therapistLanguage.createMany({
    data: [
      { therapistId: therapist1.id, language: 'English', proficiency: LanguageProficiency.NATIVE },
      { therapistId: therapist1.id, language: 'Spanish', proficiency: LanguageProficiency.FLUENT },
    ],
  });

  // Add specializations for therapist 1
  await prisma.therapistSpecialization.createMany({
    data: [
      { therapistId: therapist1.id, specializationId: specializations[0].id }, // Anxiety
      { therapistId: therapist1.id, specializationId: specializations[1].id }, // Depression
      { therapistId: therapist1.id, specializationId: specializations[3].id }, // Trauma
    ],
  });

  // Add availability for therapist 1 (Mon-Fri 9am-5pm)
  for (let day = 1; day <= 5; day++) {
    await prisma.therapistAvailability.create({
      data: {
        therapistId: therapist1.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      },
    });
  }

  // Therapist 2: Dr. Michael Chen
  const therapistUser2 = await prisma.user.create({
    data: {
      email: 'dr.chen@test.com',
      phone: '+1555000002',
      passwordHash,
      role: UserRole.THERAPIST,
      firstName: 'Michael',
      lastName: 'Chen',
      displayName: 'Dr. Michael Chen',
      avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      emailVerified: true,
      phoneVerified: true,
      timezone: 'America/Los_Angeles',
      bio: 'Cognitive behavioral therapy specialist focused on helping clients overcome anxiety and build healthy relationships.',
    },
  });

  const therapist2 = await prisma.therapist.create({
    data: {
      userId: therapistUser2.id,
      professionalTitle: 'Licensed Marriage & Family Therapist',
      yearsOfExperience: 8,
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      verificationStatus: TherapistVerificationStatus.APPROVED,
      verifiedAt: new Date(),
      isOnline: true,
      hourlyRate: 12000, // $120
      thirtyMinRate: 6500, // $65
      sixtyMinRate: 12000, // $120
      ninetyMinRate: 17000, // $170
      averageRating: 4.9,
      totalReviews: 89,
      totalBookings: 234,
    },
  });

  await prisma.therapistLanguage.createMany({
    data: [
      { therapistId: therapist2.id, language: 'English', proficiency: LanguageProficiency.NATIVE },
      { therapistId: therapist2.id, language: 'Mandarin', proficiency: LanguageProficiency.NATIVE },
    ],
  });

  await prisma.therapistSpecialization.createMany({
    data: [
      { therapistId: therapist2.id, specializationId: specializations[0].id }, // Anxiety
      { therapistId: therapist2.id, specializationId: specializations[2].id }, // Relationships
      { therapistId: therapist2.id, specializationId: specializations[4].id }, // Stress
    ],
  });

  // Therapist 3: Dr. Emily Davis
  const therapistUser3 = await prisma.user.create({
    data: {
      email: 'dr.davis@test.com',
      phone: '+1555000003',
      passwordHash,
      role: UserRole.THERAPIST,
      firstName: 'Emily',
      lastName: 'Davis',
      displayName: 'Dr. Emily Davis',
      avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
      emailVerified: true,
      phoneVerified: true,
      timezone: 'America/Chicago',
      bio: 'Specializing in addiction recovery and trauma-informed care with a compassionate, client-centered approach.',
    },
  });

  const therapist3 = await prisma.therapist.create({
    data: {
      userId: therapistUser3.id,
      professionalTitle: 'Licensed Clinical Social Worker',
      yearsOfExperience: 15,
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      verificationStatus: TherapistVerificationStatus.APPROVED,
      verifiedAt: new Date(),
      isOnline: false,
      hourlyRate: 10000, // $100
      thirtyMinRate: 5500, // $55
      sixtyMinRate: 10000, // $100
      ninetyMinRate: 14000, // $140
      averageRating: 4.7,
      totalReviews: 201,
      totalBookings: 567,
    },
  });

  await prisma.therapistLanguage.createMany({
    data: [
      { therapistId: therapist3.id, language: 'English', proficiency: LanguageProficiency.NATIVE },
    ],
  });

  await prisma.therapistSpecialization.createMany({
    data: [
      { therapistId: therapist3.id, specializationId: specializations[3].id }, // Trauma
      { therapistId: therapist3.id, specializationId: specializations[5].id }, // Addiction
    ],
  });

  // ============================================
  // CREATE PAYMENT METHODS
  // ============================================
  console.log('Creating payment methods...');
  const paymentMethod1 = await prisma.paymentMethod.create({
    data: {
      userId: testUser.id,
      stripePaymentMethodId: 'pm_test_visa_001',
      type: 'CARD',
      brand: 'VISA',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
      isVerified: true,
    },
  });

  await prisma.paymentMethod.create({
    data: {
      userId: testUser.id,
      stripePaymentMethodId: 'pm_test_mastercard_001',
      type: 'CARD',
      brand: 'MASTERCARD',
      last4: '5555',
      expiryMonth: 6,
      expiryYear: 2026,
      isDefault: false,
      isVerified: true,
    },
  });

  await prisma.paymentMethod.create({
    data: {
      userId: testUser2.id,
      stripePaymentMethodId: 'pm_test_visa_002',
      type: 'CARD',
      brand: 'VISA',
      last4: '1234',
      expiryMonth: 3,
      expiryYear: 2028,
      isDefault: true,
      isVerified: true,
    },
  });

  // ============================================
  // CREATE APPOINTMENTS
  // ============================================
  console.log('Creating appointments...');

  const now = new Date();

  // Helper to create dates
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const addHours = (date: Date, hours: number) => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  };

  const setTime = (date: Date, hours: number, minutes: number = 0) => {
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  };

  // ---- UPCOMING APPOINTMENTS ----

  // Appointment 1: Confirmed - Tomorrow at 10am
  const appointment1 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist1.id,
      scheduledAt: setTime(addDays(now, 1), 10, 0),
      duration: 60,
      timezone: 'America/New_York',
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
      amount: 15000,
      bookingNotes: 'First session - would like to discuss anxiety management techniques.',
    },
  });

  // Payment for appointment 1
  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment1.id,
      stripePaymentIntentId: 'pi_test_001',
      amount: 15000,
      platformFee: 1500,
      therapistAmount: 13500,
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
    },
  });

  // Appointment 2: Pending - 3 days from now
  const appointment2 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist2.id,
      scheduledAt: setTime(addDays(now, 3), 14, 30),
      duration: 30,
      timezone: 'America/New_York',
      status: AppointmentStatus.PENDING,
      amount: 6500,
      bookingNotes: 'Follow-up session for relationship counseling.',
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment2.id,
      stripePaymentIntentId: 'pi_test_002',
      amount: 6500,
      platformFee: 650,
      therapistAmount: 5850,
      status: PaymentStatus.PENDING,
    },
  });

  // Appointment 3: Confirmed - Next week
  const appointment3 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist1.id,
      scheduledAt: setTime(addDays(now, 7), 11, 0),
      duration: 60,
      timezone: 'America/New_York',
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
      amount: 15000,
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment3.id,
      stripePaymentIntentId: 'pi_test_003',
      amount: 15000,
      platformFee: 1500,
      therapistAmount: 13500,
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
    },
  });

  // Appointment 4: Confirmed - In 2 hours (for testing "Join" functionality)
  const appointment4 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist2.id,
      scheduledAt: addHours(now, 2),
      duration: 60,
      timezone: 'America/New_York',
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
      amount: 12000,
      bookingNotes: 'Urgent session - stress management.',
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment4.id,
      stripePaymentIntentId: 'pi_test_004',
      amount: 12000,
      platformFee: 1200,
      therapistAmount: 10800,
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
    },
  });

  // Appointment 5: Confirmed - In 30 minutes (imminent)
  const appointment5 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist1.id,
      scheduledAt: addHours(now, 0.5),
      duration: 30,
      timezone: 'America/New_York',
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
      amount: 8000,
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment5.id,
      stripePaymentIntentId: 'pi_test_005',
      amount: 8000,
      platformFee: 800,
      therapistAmount: 7200,
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
    },
  });

  // ---- PAST APPOINTMENTS (COMPLETED) ----

  // Appointment 6: Completed - Yesterday
  const appointment6 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist1.id,
      scheduledAt: setTime(addDays(now, -1), 10, 0),
      duration: 60,
      timezone: 'America/New_York',
      status: AppointmentStatus.COMPLETED,
      confirmedAt: addDays(now, -3),
      completedAt: setTime(addDays(now, -1), 11, 0),
      sessionStartedAt: setTime(addDays(now, -1), 10, 0),
      sessionEndedAt: setTime(addDays(now, -1), 11, 2),
      actualDuration: 62,
      amount: 15000,
      sessionNotes: 'Patient showed good progress with breathing exercises. Recommended daily practice.',
      bookingNotes: 'Discuss coping strategies for work-related anxiety.',
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment6.id,
      stripePaymentIntentId: 'pi_test_006',
      amount: 15000,
      platformFee: 1500,
      therapistAmount: 13500,
      status: PaymentStatus.SUCCESS,
      paidAt: addDays(now, -3),
    },
  });

  // Review for appointment 6
  await prisma.review.create({
    data: {
      userId: testUser.id,
      therapistId: therapist1.id,
      appointmentId: appointment6.id,
      rating: 5,
      feedback: 'Dr. Johnson was incredibly helpful. She provided practical techniques that I could use immediately. Highly recommend!',
      tags: ['Professional', 'Helpful', 'Good Listener', 'Knowledgeable'],
      isAnonymous: false,
    },
  });

  // Appointment 7: Completed - 3 days ago (no review yet)
  const appointment7 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist2.id,
      scheduledAt: setTime(addDays(now, -3), 15, 0),
      duration: 60,
      timezone: 'America/New_York',
      status: AppointmentStatus.COMPLETED,
      confirmedAt: addDays(now, -5),
      completedAt: setTime(addDays(now, -3), 16, 0),
      sessionStartedAt: setTime(addDays(now, -3), 15, 0),
      sessionEndedAt: setTime(addDays(now, -3), 16, 5),
      actualDuration: 65,
      amount: 12000,
      sessionNotes: 'Discussed relationship patterns. Patient making good progress identifying triggers.',
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment7.id,
      stripePaymentIntentId: 'pi_test_007',
      amount: 12000,
      platformFee: 1200,
      therapistAmount: 10800,
      status: PaymentStatus.SUCCESS,
      paidAt: addDays(now, -5),
    },
  });

  // Appointment 8: Completed - 1 week ago
  const appointment8 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist1.id,
      scheduledAt: setTime(addDays(now, -7), 9, 0),
      duration: 90,
      timezone: 'America/New_York',
      status: AppointmentStatus.COMPLETED,
      confirmedAt: addDays(now, -10),
      completedAt: setTime(addDays(now, -7), 10, 30),
      sessionStartedAt: setTime(addDays(now, -7), 9, 0),
      sessionEndedAt: setTime(addDays(now, -7), 10, 35),
      actualDuration: 95,
      amount: 20000,
      sessionNotes: 'Extended session to cover trauma-informed techniques. Patient responded well.',
      bookingNotes: 'Extended session to address multiple issues.',
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment8.id,
      stripePaymentIntentId: 'pi_test_008',
      amount: 20000,
      platformFee: 2000,
      therapistAmount: 18000,
      status: PaymentStatus.SUCCESS,
      paidAt: addDays(now, -10),
    },
  });

  await prisma.review.create({
    data: {
      userId: testUser.id,
      therapistId: therapist1.id,
      appointmentId: appointment8.id,
      rating: 5,
      feedback: 'The extended session was exactly what I needed. Dr. Johnson took the time to really understand my situation.',
      tags: ['Professional', 'Empathetic', 'Knowledgeable'],
      isAnonymous: false,
    },
  });

  // Appointment 9: Completed - 2 weeks ago
  const appointment9 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist3.id,
      scheduledAt: setTime(addDays(now, -14), 13, 0),
      duration: 60,
      timezone: 'America/New_York',
      status: AppointmentStatus.COMPLETED,
      confirmedAt: addDays(now, -16),
      completedAt: setTime(addDays(now, -14), 14, 0),
      sessionStartedAt: setTime(addDays(now, -14), 13, 0),
      sessionEndedAt: setTime(addDays(now, -14), 14, 0),
      actualDuration: 60,
      amount: 10000,
      sessionNotes: 'Initial assessment completed. Developed treatment plan.',
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment9.id,
      stripePaymentIntentId: 'pi_test_009',
      amount: 10000,
      platformFee: 1000,
      therapistAmount: 9000,
      status: PaymentStatus.SUCCESS,
      paidAt: addDays(now, -16),
    },
  });

  await prisma.review.create({
    data: {
      userId: testUser.id,
      therapistId: therapist3.id,
      appointmentId: appointment9.id,
      rating: 4,
      feedback: 'Very professional and knowledgeable. The session was helpful.',
      tags: ['Professional', 'Helpful'],
      isAnonymous: true,
    },
  });

  // ---- CANCELLED APPOINTMENTS ----

  // Appointment 10: Cancelled by user
  const appointment10 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist2.id,
      scheduledAt: setTime(addDays(now, -2), 16, 0),
      duration: 60,
      timezone: 'America/New_York',
      status: AppointmentStatus.CANCELLED,
      confirmedAt: addDays(now, -5),
      cancelledAt: addDays(now, -3),
      amount: 12000,
      cancellationReason: 'Schedule conflict: Had an unexpected work meeting.',
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment10.id,
      stripePaymentIntentId: 'pi_test_010',
      amount: 12000,
      platformFee: 1200,
      therapistAmount: 10800,
      refundedAmount: 12000,
      status: PaymentStatus.REFUNDED,
      paidAt: addDays(now, -5),
      refundedAt: addDays(now, -3),
    },
  });

  // Appointment 11: Cancelled - Partial refund
  const appointment11 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist1.id,
      scheduledAt: setTime(addDays(now, -5), 11, 0),
      duration: 60,
      timezone: 'America/New_York',
      status: AppointmentStatus.CANCELLED,
      confirmedAt: addDays(now, -7),
      cancelledAt: addDays(now, -5),
      amount: 15000,
      cancellationReason: 'Personal reasons: Feeling better, decided to pause therapy.',
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment11.id,
      stripePaymentIntentId: 'pi_test_011',
      amount: 15000,
      platformFee: 1500,
      therapistAmount: 13500,
      refundedAmount: 7500, // 50% refund
      status: PaymentStatus.PARTIALLY_REFUNDED,
      paidAt: addDays(now, -7),
      refundedAt: addDays(now, -5),
    },
  });

  // Appointment 12: No-show
  const appointment12 = await prisma.appointment.create({
    data: {
      userId: testUser.id,
      therapistId: therapist3.id,
      scheduledAt: setTime(addDays(now, -10), 10, 0),
      duration: 60,
      timezone: 'America/New_York',
      status: AppointmentStatus.NO_SHOW,
      confirmedAt: addDays(now, -12),
      amount: 10000,
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser.id,
      appointmentId: appointment12.id,
      stripePaymentIntentId: 'pi_test_012',
      amount: 10000,
      platformFee: 1000,
      therapistAmount: 9000,
      status: PaymentStatus.SUCCESS,
      paidAt: addDays(now, -12),
    },
  });

  // ---- APPOINTMENTS FOR USER 2 ----

  // Appointment 13: Confirmed for user 2
  const appointment13 = await prisma.appointment.create({
    data: {
      userId: testUser2.id,
      therapistId: therapist1.id,
      scheduledAt: setTime(addDays(now, 2), 14, 0),
      duration: 60,
      timezone: 'America/Los_Angeles',
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
      amount: 15000,
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser2.id,
      appointmentId: appointment13.id,
      stripePaymentIntentId: 'pi_test_013',
      amount: 15000,
      platformFee: 1500,
      therapistAmount: 13500,
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
    },
  });

  // Appointment 14: Completed for user 2
  const appointment14 = await prisma.appointment.create({
    data: {
      userId: testUser2.id,
      therapistId: therapist2.id,
      scheduledAt: setTime(addDays(now, -4), 10, 0),
      duration: 30,
      timezone: 'America/Los_Angeles',
      status: AppointmentStatus.COMPLETED,
      confirmedAt: addDays(now, -6),
      completedAt: setTime(addDays(now, -4), 10, 30),
      sessionStartedAt: setTime(addDays(now, -4), 10, 0),
      sessionEndedAt: setTime(addDays(now, -4), 10, 32),
      actualDuration: 32,
      amount: 6500,
      sessionNotes: 'Brief check-in session. Patient maintaining progress.',
    },
  });

  await prisma.payment.create({
    data: {
      userId: testUser2.id,
      appointmentId: appointment14.id,
      stripePaymentIntentId: 'pi_test_014',
      amount: 6500,
      platformFee: 650,
      therapistAmount: 5850,
      status: PaymentStatus.SUCCESS,
      paidAt: addDays(now, -6),
    },
  });

  // ============================================
  // CREATE NOTIFICATIONS
  // ============================================
  console.log('Creating notifications...');

  await prisma.notification.createMany({
    data: [
      {
        userId: testUser.id,
        type: 'APPOINTMENT_REMINDER',
        title: 'Appointment Tomorrow',
        message: 'Your appointment with Dr. Sarah Johnson is tomorrow at 10:00 AM.',
        isRead: false,
      },
      {
        userId: testUser.id,
        type: 'BOOKING_CONFIRMATION',
        title: 'Booking Confirmed',
        message: 'Your appointment with Dr. Michael Chen has been confirmed.',
        isRead: true,
      },
      {
        userId: testUser.id,
        type: 'PAYMENT_RECEIPT',
        title: 'Payment Received',
        message: 'Your payment of $150.00 has been processed successfully.',
        isRead: true,
      },
    ],
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n=== Seed completed successfully! ===\n');
  console.log('Created:');
  console.log(`  - ${specializations.length} Specializations`);
  console.log('  - 2 Test Patients (patient@test.com, patient2@test.com)');
  console.log('  - 3 Therapists (dr.sarah@test.com, dr.chen@test.com, dr.davis@test.com)');
  console.log('  - 3 Payment Methods');
  console.log('  - 14 Appointments:');
  console.log('    - 5 Upcoming (1 pending, 4 confirmed)');
  console.log('    - 4 Completed (with session notes)');
  console.log('    - 2 Cancelled (1 full refund, 1 partial)');
  console.log('    - 1 No-show');
  console.log('    - 2 for second user');
  console.log('  - 3 Reviews');
  console.log('  - 3 Notifications');
  console.log('\nAll test users use password: Password123!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
