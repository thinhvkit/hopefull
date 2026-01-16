import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App | null = null;

  onModuleInit() {
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // Check if we have valid credentials
    if (projectId && clientEmail && privateKey && privateKey.includes('PRIVATE KEY')) {
      try {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.log('[Firebase] Initialized successfully');
      } catch (error) {
        console.warn('[Firebase] Failed to initialize:', error.message);
        console.warn('[Firebase] Phone authentication will be disabled');
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        this.app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        console.log('[Firebase] Initialized with application default credentials');
      } catch (error) {
        console.warn('[Firebase] Failed to initialize:', error.message);
      }
    } else {
      console.warn('[Firebase] No valid credentials provided. Phone authentication will be disabled.');
    }
  }

  get auth(): admin.auth.Auth | null {
    return this.app ? admin.auth(this.app) : null;
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.auth) {
      throw new Error('Firebase is not initialized');
    }
    return this.auth.verifyIdToken(idToken);
  }

  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    if (!this.auth) {
      throw new Error('Firebase is not initialized');
    }
    return this.auth.getUser(uid);
  }
}
