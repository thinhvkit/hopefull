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

  get firestore(): admin.firestore.Firestore | null {
    return this.app ? admin.firestore(this.app) : null;
  }

  /**
   * Upload an avatar image to Firestore
   * @param base64Data Base64 encoded file data (without data:image/... prefix)
   * @param userId User ID to associate the avatar with
   * @param contentType MIME type (e.g., 'image/jpeg')
   * @returns Data URL of the avatar (can be used directly in img src)
   */
  async uploadAvatar(
    base64Data: string,
    userId: string,
    contentType: string,
  ): Promise<string> {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized');
    }

    try {
      // Create data URL from base64
      const dataUrl = `data:${contentType};base64,${base64Data}`;

      // Check size (Firestore document limit is 1MB, we'll limit avatar to 500KB)
      const sizeInBytes = base64Data.length * 0.75; // base64 is ~33% larger
      const maxSize = 500 * 1024; // 500KB

      if (sizeInBytes > maxSize) {
        throw new Error('Image too large. Please use a smaller image (max 500KB after compression).');
      }

      // Store in Firestore
      await this.firestore.collection('avatars').doc(userId).set({
        dataUrl,
        contentType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[Firebase Firestore] Avatar uploaded for user ${userId}`);
      return dataUrl;
    } catch (error) {
      console.error('[Firebase Firestore] Upload error:', error.message);
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }
  }

  /**
   * Get avatar from Firestore
   * @param userId User ID
   * @returns Data URL of the avatar or null if not found
   */
  async getAvatar(userId: string): Promise<string | null> {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized');
    }

    try {
      const doc = await this.firestore.collection('avatars').doc(userId).get();
      if (doc.exists) {
        const data = doc.data();
        return data?.dataUrl || null;
      }
      return null;
    } catch (error) {
      console.error('[Firebase Firestore] Get avatar error:', error.message);
      return null;
    }
  }

  /**
   * Delete avatar from Firestore
   * @param userId User ID
   */
  async deleteAvatar(userId: string): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firebase Firestore is not initialized');
    }

    try {
      await this.firestore.collection('avatars').doc(userId).delete();
      console.log(`[Firebase Firestore] Avatar deleted for user ${userId}`);
    } catch (error) {
      // Ignore if document doesn't exist
      console.warn('[Firebase Firestore] Delete avatar error:', error.message);
    }
  }
}
