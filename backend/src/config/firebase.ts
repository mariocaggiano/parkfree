import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let app: admin.app.App;

export const initializeFirebase = (): admin.app.App => {
  if (app) {
    return app;
  }

  let serviceAccount: admin.ServiceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const filePath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    serviceAccount = JSON.parse(fileContent) as admin.ServiceAccount;
  } else {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    };
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });

  return app;
};

export const getAuth = (): admin.auth.Auth => {
  const firebaseApp = initializeFirebase();
  return admin.auth(firebaseApp);
};

export const verifyIdToken = async (idToken: string): Promise<admin.auth.DecodedIdToken> => {
  const auth = getAuth();
  return auth.verifyIdToken(idToken);
};

export default initializeFirebase;
