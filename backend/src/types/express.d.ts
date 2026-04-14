/**
 * Estensioni globali di Express.Request per ParkFree backend.
 * Centralizza tutte le proprietà custom aggiunte dai middleware.
 */
declare global {
  namespace Express {
    interface Request {
      /** Timestamp (ms) di inizio richiesta — impostato dall'app middleware */
      requestTime?: number;

      /** Utente autenticato via Firebase (impostato da authMiddleware) */
      user?: {
        uid: string;
        email?: string;
        name?: string;
        phone?: string;
      };
    }
  }
}

export {};
