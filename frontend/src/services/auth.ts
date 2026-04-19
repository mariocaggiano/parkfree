import {
  initializeApp,
  getApps,
  FirebaseApp,
} from 'firebase/app';
import {
  getAuth,
  Auth,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  updateProfile,
  AuthError,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

let app: FirebaseApp;
let auth: Auth;

const initFirebase = () => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } else {
    app = getApps()[0];
    auth = getAuth(app);
  }
};

initFirebase();

// Translate Firebase error codes to Italian user-friendly messages
export const translateFirebaseError = (error: AuthError | Error): string => {
  const code = (error as AuthError).code || '';

  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Email o password non corretti.',
    'auth/invalid-email': 'Indirizzo email non valido.',
    'auth/user-disabled': 'Questo account è stato disabilitato.',
    'auth/user-not-found': 'Nessun account trovato con questa email.',
    'auth/wrong-password': 'Password non corretta.',
    'auth/email-already-in-use': 'Questa email è già registrata.',
    'auth/weak-password': 'La password deve essere di almeno 6 caratteri.',
    'auth/operation-not-allowed': 'Metodo di accesso non abilitato.',
    'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
    'auth/network-request-failed': 'Errore di rete. Controlla la connessione.',
    'auth/popup-closed-by-user': 'Finestra di accesso chiusa. Riprova.',
    'auth/popup-blocked': 'Il browser ha bloccato la finestra popup. Prova di nuovo o consenti i popup.',
    'auth/cancelled-popup-request': 'Accesso annullato.',
    'auth/account-exists-with-different-credential': 'Esiste già un account con questa email ma con un metodo di accesso diverso.',
    'auth/unauthorized-domain': 'Dominio non autorizzato per questo progetto Firebase.',
    'auth/requires-recent-login': 'Sessione scaduta. Effettua di nuovo il login.',
    'auth/invalid-verification-code': 'Codice OTP non valido.',
    'auth/invalid-phone-number': 'Numero di telefono non valido. Usa il formato +39XXXXXXXXXX.',
    'auth/missing-phone-number': 'Inserisci il numero di telefono.',
    'auth/quota-exceeded': 'Limite di invii SMS raggiunto. Riprova più tardi.',
  };

  return messages[code] || 'Si è verificato un errore. Riprova più tardi.';
};

export const authService = {
  // Email/Password Auth
  signInWithEmail: async (email: string, password: string): Promise<User | null> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      const msg = translateFirebaseError(error as AuthError);
      throw new Error(msg);
    }
  },

  signUpWithEmail: async (
    email: string,
    password: string,
    displayName: string
  ): Promise<User | null> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      await updateProfile(user, { displayName });
      return user;
    } catch (error) {
      const msg = translateFirebaseError(error as AuthError);
      throw new Error(msg);
    }
  },

  // Google OAuth — try popup first, fall back to redirect
  signInWithGoogle: async (): Promise<User | null> => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      const authError = error as AuthError;
      if (
        authError.code === 'auth/popup-blocked' ||
        authError.code === 'auth/popup-closed-by-user' ||
        authError.code === 'auth/cancelled-popup-request'
      ) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      const msg = translateFirebaseError(authError);
      throw new Error(msg);
    }
  },

  // Call this on app startup to handle OAuth redirect results
  checkRedirectResult: async (): Promise<User | null> => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        return result.user;
      }
      return null;
    } catch (error) {
      const msg = translateFirebaseError(error as AuthError);
      console.error('Redirect result error:', msg);
      return null;
    }
  },

  // Phone number auth
  signInWithPhone: async (phoneNumber: string): Promise<ConfirmationResult> => {
    try {
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier
      );
      return confirmationResult;
    } catch (error) {
      const msg = translateFirebaseError(error as AuthError);
      throw new Error(msg);
    }
  },

  // Verify phone OTP
  verifyPhoneOTP: async (
    confirmationResult: ConfirmationResult,
    otp: string
  ): Promise<User | null> => {
    try {
      const result = await confirmationResult.confirm(otp);
      return result.user;
    } catch (error) {
      const msg = translateFirebaseError(error as AuthError);
      throw new Error(msg);
    }
  },

  // Sign out
  signOut: async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      const msg = translateFirebaseError(error as AuthError);
      throw new Error(msg);
    }
  },

  getCurrentUser: (): User | null => {
    return auth.currentUser;
  },

  getAuth: () => auth,

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return auth.onAuthStateChanged(callback);
  },
};
