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
  OAuthProvider,
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
    'auth/popup-blocked': 'Il browser ha bloccato il popup. Prova di nuovo o consenti i popup.',
    'auth/cancelled-popup-request': 'Accesso annullato.',
    'auth/account-exists-with-different-credential': 'Esiste già un account con questa email ma con metodo diverso.',
    'auth/unauthorized-domain': 'Dominio non autorizzato per questo progetto Firebase.',
    'auth/requires-recent-login': 'Sessione scaduta. Effettua di nuovo il login.',
    'auth/invalid-verification-code': 'Codice OTP non valido.',
    'auth/invalid-phone-number': 'Numero di telefono non valido. Usa il formato +39XXXXXXXXXX.',
    'auth/missing-phone-number': 'Inserisci il numero di telefono.',
    'auth/quota-exceeded': 'Limite SMS raggiunto. Riprova più tardi.',
  };
  return messages[code] || 'Si è verificato un errore. Riprova più tardi.';
};

export const authService = {
  signInWithEmail: async (email: string, password: string): Promise<User | null> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      throw new Error(translateFirebaseError(error as AuthError));
    }
  },

  signUpWithEmail: async (email: string, password: string, displayName: string): Promise<User | null> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      return result.user;
    } catch (error) {
      throw new Error(translateFirebaseError(error as AuthError));
    }
  },

  signInWithGoogle: async (): Promise<User | null> => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      const authError = error as AuthError;
      if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(authError.code)) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw new Error(translateFirebaseError(authError));
    }
  },

  signInWithApple: async (): Promise<User | null> => {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      const authError = error as AuthError;
      if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(authError.code)) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      if (['auth/operation-not-allowed', 'auth/internal-error'].includes(authError.code)) {
        throw new Error('Accesso con Apple non ancora disponibile. Usa email o Google.');
      }
      throw new Error(translateFirebaseError(authError));
    }
  },

  checkRedirectResult: async (): Promise<User | null> => {
    try {
      const result = await getRedirectResult(auth);
      return result ? result.user : null;
    } catch (error) {
      console.error('Redirect result error:', translateFirebaseError(error as AuthError));
      return null;
    }
  },

  signInWithPhone: async (phoneNumber: string): Promise<ConfirmationResult> => {
    try {
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    } catch (error) {
      throw new Error(translateFirebaseError(error as AuthError));
    }
  },

  verifyPhoneOTP: async (confirmationResult: ConfirmationResult, otp: string): Promise<User | null> => {
    try {
      const result = await confirmationResult.confirm(otp);
      return result.user;
    } catch (error) {
      throw new Error(translateFirebaseError(error as AuthError));
    }
  },

  signOut: async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw new Error(translateFirebaseError(error as AuthError));
    }
  },

  getCurrentUser: (): User | null => auth.currentUser,
  getAuth: () => auth,
  onAuthStateChanged: (callback: (user: User | null) => void) => auth.onAuthStateChanged(callback),
};
