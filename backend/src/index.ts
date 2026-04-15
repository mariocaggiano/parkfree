import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeFirebase } from './config/firebase';
import { initializeStripe } from './config/stripe';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import vehiclesRoutes from './routes/vehicles';
import zonesRoutes from './routes/zones';
import sessionsRoutes from './routes/sessions';
import paymentsRoutes from './routes/payments';
import walletRoutes from './routes/wallet';
import analyticsRoutes from './routes/analytics';
import referralRoutes from './routes/referral';
import enforcementRoutes from './routes/enforcement';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,https://parkfree.vercel.app')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl in dev)
      if (!origin) return callback(null, true);
      // In development allow localhost origins (never bypass in production)
      if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// âââ Rate limiting âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Limita le richieste per prevenire brute force e abusi

// Auth: 20 tentativi ogni 15 minuti per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di accesso. Riprova tra 15 minuti.' },
});

// Wallet top-up: 10 ricariche ogni ora per IP
const topupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di ricarica. Riprova tra un\'ora.' },
});

// Enforcement: 200 verifiche targa ogni minuto per IP (uso da app mobile ausiliari)
const enforcementLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite richieste enforcement superato. Rallentare.' },
});

// API generica: 300 richieste ogni 15 minuti per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppe richieste. Riprova tra poco.' },
  skip: (req) => req.path === '/health', // escludi health check
});

app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    skip: (req: Request) => {
      return process.env.NODE_ENV === 'test';
    },
  })
);

// Raw body per Stripe webhook â DEVE stare prima di express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// SEC-003: body limit ridotto (10mb â 100kb) per prevenire attacchi DoS via payload
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ limit: '100kb', extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestTime = Date.now();
  next();
});

initializeFirebase();
initializeStripe();

// Applica rate limiter generale a tutte le API
app.use('/api', generalLimiter);

// Rate limiter specifici per endpoint sensibili
app.use('/api/auth', authLimiter);
app.use('/api/wallet/topup', topupLimiter);
app.use('/api/enforcement', enforcementLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/enforcement', enforcementRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `${req.method} ${req.path} not found`,
  });
});

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

app.use((err: AppError, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const server = app.listen(PORT, () => {
  console.log(`ParkFree backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

export default app;
