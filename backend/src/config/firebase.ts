import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson || serviceAccountJson === 'placeholder') {
      console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT non configurato - Firebase disabilitato');
      return null;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    if (!serviceAccount.project_id) {
      console.warn('[Firebase] Service account mancante di project_id - Firebase disabilitato');
      return null;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });

    console.log('[Firebase] Inizializzato con successo');
    return firebaseApp;
  } catch (error) {
    console.warn('[Firebase] Errore inizializzazione (non critico):', error);
    return null;
  }
}

export function getFirebaseAdmin(): admin.app.App | null {
  return firebaseApp;
}

export function getFirebaseAuth(): admin.auth.Auth | null {
  if (!firebaseApp) return null;
  return admin.auth(firebaseApp);
}

export default admin;
