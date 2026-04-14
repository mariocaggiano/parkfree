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
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  updateProfile,
} from 'firebase/auth';

// Replace these with your actual Firebase config
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

// Initialize Firebase
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

export const authService = {
  // Email/Password Auth
  signInWithEmail: async (email: string, password: string): Promise<User | null> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
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

      // Update profile with display name
      await updateProfile(user, { displayName });

      return user;
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  },

  // Google OAuth
  signInWithGoogle: async (): Promise<User | null> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  },

  // Apple OAuth
  signInWithApple: async (): Promise<User | null> => {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      throw error;
    }
  },

  // Phone number auth
  signInWithPhone: async (phoneNumber: string): Promise<ConfirmationResult> => {
    try {
      // Setup recaptcha verifier
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
      console.error('Error sending phone verification:', error);
      throw error;
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
      console.error('Error verifying OTP:', error);
      throw error;
    }
  },

  // Sign out
  signOut: async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: (): User | null => {
    return auth.currentUser;
  },

  // Get auth state
  getAuth: () => auth,

  // Listen to auth state changes
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return auth.onAuthStateChanged(callback);
  },
};
