export interface User {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  licensePlate: string;
  alias?: string;
  defaultBadge: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingZone {
  id: string;
  name: string;
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  polygon?: Array<[number, number]>;
  hourlyRate: number;
  maxDuration: number;
  operatingHours: {
    start: string;
    end: string;
  };
  dayOfWeek: number[];
  disabled?: boolean;
}

export interface ParkingSession {
  id: string;
  userId: string;
  vehicleId: string;
  zoneId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  cost: number;
  status: 'active' | 'completed' | 'cancelled';
  paymentMethodId: string;
  receipt?: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: string;
}

export interface SpendingData {
  month: string;
  amount: number;
}

export interface ZoneStatistic {
  name: string;
  value: number;
  percentage: number;
}

export interface SessionStats {
  totalSpentThisMonth: number;
  averagePerSession: number;
  totalSessions: number;
  topZone: string;
}

export type WalletTxType =
  | 'topup'
  | 'topup_bonus'
  | 'session_debit'
  | 'session_refund'
  | 'referral_credit'
  | 'promo_credit';

export interface WalletTransaction {
  id: string;
  type: WalletTxType;
  amount: number;          // positivo = entrata, negativo = uscita
  balanceAfter: number;
  description: string;
  sessionId?: string;
  createdAt: string;
}

export interface WalletBalance {
  balance: number;
  recentTransactions: WalletTransaction[];
}

export interface TopupOption {
  amount: number;
  bonus: number;
  totalCredit: number;
  label: string;
}
