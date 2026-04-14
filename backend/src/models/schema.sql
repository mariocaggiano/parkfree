-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  name VARCHAR(255),
  stripe_customer_id VARCHAR(255) UNIQUE,
  wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, plate)
);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);

-- Parking zones table
CREATE TABLE IF NOT EXISTS parking_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_code VARCHAR(50) NOT NULL,
  zone_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  geometry GEOMETRY(POLYGON, 4326) NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  max_duration_min INTEGER,
  free_hours JSONB DEFAULT '{"start": null, "end": null}',
  active_hours JSONB DEFAULT '{"monday": {"start": "08:00", "end": "20:00"}, "tuesday": {"start": "08:00", "end": "20:00"}, "wednesday": {"start": "08:00", "end": "20:00"}, "thursday": {"start": "08:00", "end": "20:00"}, "friday": {"start": "08:00", "end": "20:00"}, "saturday": null, "sunday": null}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parking_zones_city ON parking_zones(city_code);
CREATE INDEX idx_parking_zones_geometry ON parking_zones USING GIST(geometry);
CREATE UNIQUE INDEX idx_parking_zones_city_code ON parking_zones(city_code, zone_code);

-- Parking sessions table
CREATE TYPE session_status AS ENUM('active', 'extended', 'completed', 'cancelled', 'expired');

CREATE TABLE IF NOT EXISTS parking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES parking_zones(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  planned_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  status session_status DEFAULT 'active',
  parking_cost DECIMAL(10, 2) NOT NULL,
  service_fee DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  stripe_payment_id VARCHAR(255),
  auto_extend BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parking_sessions_user_id ON parking_sessions(user_id);
CREATE INDEX idx_parking_sessions_vehicle_id ON parking_sessions(vehicle_id);
CREATE INDEX idx_parking_sessions_zone_id ON parking_sessions(zone_id);
CREATE INDEX idx_parking_sessions_status ON parking_sessions(status);
CREATE INDEX idx_parking_sessions_started_at ON parking_sessions(started_at);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_pm_id VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  last_four VARCHAR(4),
  brand VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(user_id, is_default);

-- Parking zones seed data for Milan
INSERT INTO parking_zones (city_code, zone_code, name, geometry, hourly_rate, max_duration_min, free_hours, active_hours)
VALUES
  (
    'MI',
    'A',
    'Centro Storico - Duomo',
    ST_PolygonFromText('POLYGON((9.1826 45.4642, 9.1945 45.4642, 9.1945 45.4584, 9.1826 45.4584, 9.1826 45.4642))', 4326),
    3.50,
    480,
    '{"start": "20:00", "end": "08:00"}',
    '{"monday": {"start": "08:00", "end": "20:00"}, "tuesday": {"start": "08:00", "end": "20:00"}, "wednesday": {"start": "08:00", "end": "20:00"}, "thursday": {"start": "08:00", "end": "20:00"}, "friday": {"start": "08:00", "end": "20:00"}, "saturday": {"start": "09:00", "end": "19:00"}, "sunday": null}'
  ),
  (
    'MI',
    'B',
    'Navigli',
    ST_PolygonFromText('POLYGON((9.1650 45.4556, 9.1800 45.4556, 9.1800 45.4450, 9.1650 45.4450, 9.1650 45.4556))', 4326),
    2.50,
    600,
    '{"start": "20:00", "end": "08:00"}',
    '{"monday": {"start": "08:00", "end": "20:00"}, "tuesday": {"start": "08:00", "end": "20:00"}, "wednesday": {"start": "08:00", "end": "20:00"}, "thursday": {"start": "08:00", "end": "20:00"}, "friday": {"start": "08:00", "end": "20:00"}, "saturday": {"start": "09:00", "end": "19:00"}, "sunday": null}'
  ),
  (
    'MI',
    'C',
    'Brera - Moscova',
    ST_PolygonFromText('POLYGON((9.1780 45.4750, 9.1900 45.4750, 9.1900 45.4680, 9.1780 45.4680, 9.1780 45.4750))', 4326),
    3.00,
    480,
    '{"start": "20:00", "end": "08:00"}',
    '{"monday": {"start": "08:00", "end": "20:00"}, "tuesday": {"start": "08:00", "end": "20:00"}, "wednesday": {"start": "08:00", "end": "20:00"}, "thursday": {"start": "08:00", "end": "20:00"}, "friday": {"start": "08:00", "end": "20:00"}, "saturday": {"start": "09:00", "end": "19:00"}, "sunday": null}'
  ),
  (
    'MI',
    'D',
    'Sant Ambrogio',
    ST_PolygonFromText('POLYGON((9.1600 45.4600, 9.1720 45.4600, 9.1720 45.4520, 9.1600 45.4520, 9.1600 45.4600))', 4326),
    2.00,
    720,
    '{"start": "20:00", "end": "08:00"}',
    '{"monday": {"start": "08:00", "end": "20:00"}, "tuesday": {"start": "08:00", "end": "20:00"}, "wednesday": {"start": "08:00", "end": "20:00"}, "thursday": {"start": "08:00", "end": "20:00"}, "friday": {"start": "08:00", "end": "20:00"}, "saturday": {"start": "09:00", "end": "19:00"}, "sunday": null}'
  ),
  (
    'MI',
    'E',
    'Garibaldi - Centrale',
    ST_PolygonFromText('POLYGON((9.1890 45.4850, 9.2000 45.4850, 9.2000 45.4780, 9.1890 45.4780, 9.1890 45.4850))', 4326),
    2.75,
    540,
    '{"start": "20:00", "end": "08:00"}',
    '{"monday": {"start": "08:00", "end": "20:00"}, "tuesday": {"start": "08:00", "end": "20:00"}, "wednesday": {"start": "08:00", "end": "20:00"}, "thursday": {"start": "08:00", "end": "20:00"}, "friday": {"start": "08:00", "end": "20:00"}, "saturday": {"start": "09:00", "end": "19:00"}, "sunday": null}'
  );

-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

-- Referrals table (traccia ogni invito)
-- ─── Wallet ─────────────────────────────────────────────────────────────────

CREATE TYPE wallet_tx_type AS ENUM(
  'topup',          -- ricarica da Stripe
  'topup_bonus',    -- bonus ricarica (es. +5% su €20)
  'session_debit',  -- addebito sessione di parcheggio
  'session_refund', -- rimborso terminazione anticipata
  'referral_credit',-- credito da sistema referral
  'promo_credit'    -- credito promozionale
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type wallet_tx_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,         -- positivo = entrata, negativo = uscita
  balance_after DECIMAL(10, 2) NOT NULL,  -- snapshot saldo dopo la tx
  description VARCHAR(255),
  session_id UUID REFERENCES parking_sessions(id) ON DELETE SET NULL,
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(user_id, created_at DESC);

-- ─── Referral ────────────────────────────────────────────────────────────────

CREATE TYPE referral_status AS ENUM('pending', 'completed', 'expired');
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  invitee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_credit DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  invitee_credit DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  status referral_status NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_referrals_code_id ON referrals(referral_code_id);
CREATE INDEX idx_referrals_invitee ON referrals(invitee_user_id);

-- User credits table (portafoglio crediti)
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(50) NOT NULL, -- 'referral_referrer' | 'referral_invitee' | 'promo'
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  session_id UUID REFERENCES parking_sessions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id, used);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parking_zones_updated_at BEFORE UPDATE ON parking_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parking_sessions_updated_at BEFORE UPDATE ON parking_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
