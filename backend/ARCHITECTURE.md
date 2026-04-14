# ParkFree Backend Architecture

## Overview

ParkFree is a production-grade REST API for Italian street parking (strisce blu) payment management. The backend is built with Node.js, Express, TypeScript, and PostgreSQL with PostGIS for geospatial queries.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Language**: TypeScript 5.2
- **Database**: PostgreSQL 13+ with PostGIS
- **Authentication**: Firebase Admin SDK
- **Payments**: Stripe
- **Development**: ts-node, nodemon, TypeScript compiler

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│                  (Web, Mobile, Progressive Web)             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Express.js Server (Port 3000)             │
├──────────────────────────────────────────────────────────────┤
│ Middleware Layer:                                            │
│ - helmet (security headers)                                 │
│ - cors (cross-origin)                                       │
│ - morgan (HTTP logging)                                     │
│ - express.json (body parsing)                              │
│ - Auth middleware (Firebase token verification)            │
├──────────────────────────────────────────────────────────────┤
│                     Route Handlers                           │
│ ┌────────────┬────────────┬──────────┬────────────┐          │
│ │   Auth     │  Vehicles  │  Zones   │  Sessions  │          │
│ │ (7 routes) │ (4 routes) │(2 routes)│(6 routes)  │          │
│ └────────────┴────────────┴──────────┴────────────┘          │
│ ┌────────────┬─────────────┐                                │
│ │  Payments  │  Analytics  │                                │
│ │ (4 routes) │ (2 routes)  │                                │
│ └────────────┴─────────────┘                                │
├──────────────────────────────────────────────────────────────┤
│                   Business Logic Layer                       │
│ ┌──────────────────┬──────────────────────────┐             │
│ │ Parking Service  │ Notifications Service    │             │
│ │ - Cost calc      │ - Push notifications     │             │
│ │ - Zone logic     │ - Expiry warnings        │             │
│ │ - Availability   │ - Session confirmations  │             │
│ └──────────────────┴──────────────────────────┘             │
├──────────────────────────────────────────────────────────────┤
│                   Data Access Layer                          │
│ ┌──────────────────────────────────────────────┐            │
│ │     Database Connection Pool (pg)             │            │
│ │     Query builder with parameterization      │            │
│ └──────────────────────────────────────────────┘            │
└──────────────────────────┬───────────────────────────────────┘
                           │ SQL
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
│ PostgreSQL   │   │  Firebase   │   │   Stripe    │
│ (Database)   │   │  (Auth)     │   │ (Payments)  │
│              │   │             │   │             │
│ - Users      │   │ - Verify    │   │ - Charge    │
│ - Vehicles   │   │   tokens    │   │ - Refund    │
│ - Zones      │   │ - Create    │   │ - Setup     │
│ - Sessions   │   │   users     │   │   intents   │
│ - Payments   │   │             │   │             │
└──────────────┘   └─────────────┘   └─────────────┘
```

## Database Schema

### Core Tables

1. **users**
   - Stores user profiles, Firebase authentication mappings
   - Links to Stripe customer IDs for payments
   - Unique firebase_uid, email

2. **vehicles**
   - User's registered vehicles
   - License plate and custom names
   - is_default flag for quick session start

3. **parking_zones**
   - Geographic zones with hourly rates
   - PostGIS POLYGON geometry for spatial queries
   - Active hours and free hours configuration
   - Maximum parking duration limits

4. **parking_sessions**
   - Individual parking records
   - Timestamps: started_at, planned_end_at, actual_end_at
   - Cost breakdown: parking_cost, service_fee, total_cost
   - Status enum: active, extended, completed, cancelled, expired
   - Links to Stripe payment_intent_id

5. **payment_methods**
   - Stored payment methods per user
   - References to Stripe payment_method IDs
   - Card details: last_four, brand
   - is_default for quick transactions

### Indexes & Performance

- Unique indexes on firebase_uid, email, (city_code, zone_code)
- Foreign key indexes for user_id, vehicle_id, zone_id
- Partial indexes for active status queries
- PostGIS GIST index on geometry for spatial queries
- Timestamp indexes for date range queries

### Triggers & Automation

- `update_*_updated_at` triggers automatically set updated_at on changes

## API Layers

### 1. Route Layer (`src/routes/`)

Handles HTTP request/response, parameter validation:

```typescript
// Example structure
router.post('/', authMiddleware, async (req, res) => {
  // 1. Validate input
  // 2. Get user from auth middleware
  // 3. Call business logic
  // 4. Return response or error
});
```

Routes organized by domain:
- **auth.ts** - User registration and login
- **users.ts** - Profile management
- **vehicles.ts** - Vehicle CRUD operations
- **zones.ts** - Parking zone queries
- **sessions.ts** - Core parking session logic
- **payments.ts** - Payment method management
- **analytics.ts** - User spending reports

### 2. Service Layer (`src/services/`)

Pure business logic, database-agnostic:

```typescript
// parking.ts exports:
calculateParkingCost()      // Zone + duration → cost
calculateServiceFee()       // Cost → fee (10%, min €0.25, max €2.00)
isZoneActiveNow()          // Zone + time → boolean
validateSessionDuration()   // Duration + zone → validation
calculateExtensionCost()   // Zone + minutes → cost breakdown
getZonesByLocation()       // Coordinates → nearby zones (PostGIS)
```

```typescript
// notifications.ts exports:
sendExpiryWarning()        // 15 minutes remaining
sendSessionComplete()       // Session ended with total cost
sendPaymentConfirmation()  // Payment processed
sendExtensionConfirmation()// Parking extended until time
```

### 3. Config Layer (`src/config/`)

Centralized external service initialization:

- **database.ts** - PostgreSQL connection pool
- **firebase.ts** - Firebase Admin SDK
- **stripe.ts** - Stripe API client

## Request/Response Flow

### Start Parking Session

```
1. Client sends: POST /api/sessions
   {
     vehicleId: uuid,
     zoneId: uuid,
     durationMinutes: number,
     paymentMethodId: stripe_id
   }

2. Middleware: authMiddleware
   - Verify Firebase token
   - Attach user.uid to request

3. Route Handler: sessions.ts POST /
   - Validate input parameters
   - Fetch user from DB
   - Verify vehicle belongs to user
   - Fetch zone details
   - Call parking.validateSessionDuration()

4. Service Layer: parking.ts
   - calculateParkingCost(zone, duration)
   - calculateServiceFee(parkingCost)
   - Determine total_cost

5. Stripe Integration
   - Create PaymentIntent
   - Optionally charge payment method

6. Database: INSERT parking_sessions
   - Record session in DB
   - Link to Stripe payment_intent_id

7. Notifications: Send payment confirmation

8. Response: 201 Created
   {
     sessionId: uuid,
     parkingCost: number,
     serviceFee: number,
     totalCost: number,
     paymentStatus: string,
     clientSecret: string (for frontend)
   }
```

## Authentication Flow

### Firebase Integration

```
1. Client authenticates with Firebase (web/mobile SDK)
2. Firebase returns ID token
3. Client includes in Authorization header: "Bearer {idToken}"
4. authMiddleware (src/middleware/auth.ts):
   - Extract token from header
   - Call firebase.auth().verifyIdToken(token)
   - Firebase returns decoded token with uid, email, name
   - Attach to req.user
5. Route handlers access req.user.uid
6. Query by firebase_uid to get database user record
```

### Session Management

- Token verification happens on every protected request
- No session/cookie storage required
- Stateless authentication (scalable)
- Token expiration handled by Firebase

## Data Integrity

### Transactions
- Database uses PostgreSQL's ACID guarantees
- Foreign keys prevent orphaned records
- Cascade delete on user deletion

### Validation
- Input validation in route handlers
- Business rule validation in services
- Database constraints (unique, not null, checks)

### Error Handling
```typescript
// Try-catch in all route handlers
try {
  // Business logic
} catch (error) {
  console.error('Error context:', error);
  res.status(500).json({ error: 'User-friendly message' });
}
```

## Parking Cost Calculation

### Formula
```
parking_cost = hourly_rate × ceil(duration_minutes / 60)
service_fee = max(0.25, min(parking_cost × 0.10, 2.00))
total_cost = parking_cost + service_fee
```

### Example
- Zone hourly rate: €2.50
- Duration: 75 minutes
- Parking cost: €2.50 × ceil(75/60) = €2.50 × 2 = €5.00
- Service fee: max(0.25, min(5.00 × 0.10, 2.00)) = €0.50
- Total cost: €5.50

## Geospatial Queries

### PostGIS Integration

```sql
-- Find zones within 1km of point
SELECT * FROM parking_zones
WHERE ST_DWithin(
  geometry,
  ST_SetSRID(ST_MakePoint(lng, lat), 4326),
  1000
)
ORDER BY ST_Distance(geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))

-- SRID 4326 = WGS84 (lat/lng)
-- Distance in meters
-- Efficient with GIST index
```

## Stripe Integration

### Payment Flow

1. **PaymentIntent Creation**
   - Amount in cents (€5.50 = 550)
   - Currency: EUR
   - Customer ID
   - Payment method
   - Off-session flag (can charge without UI)

2. **Payment Confirmation**
   - Client-side confirmation or server-side
   - Returns payment status: succeeded, requires_action, etc.

3. **Refunds**
   - When user stops parking early
   - Partial refund based on actual duration
   - Metadata tracks refund reason

## Notifications Architecture

### Push Notification Service

```typescript
sendExpiryWarning(userId, sessionId, minutesRemaining)
  → title: "Parking expiring soon"
  → body: "Your parking session expires in 15 minutes"

sendSessionComplete(userId, sessionId, totalCost)
  → title: "Parking session complete"
  → body: "Your parking session has ended. Total cost: €5.50"
```

### Implementation Status
- Stub implementation ready for FCM integration
- Receives userId, sessionId, relevant data
- Logs notification for debugging
- Ready to integrate Firebase Cloud Messaging

## Environment Configuration

### Required Variables
```env
NODE_ENV                    # development, production
PORT                        # 3000
DATABASE_URL               # PostgreSQL connection string
FIREBASE_PROJECT_ID        # From Firebase Console
FIREBASE_PRIVATE_KEY       # From service account JSON
FIREBASE_CLIENT_EMAIL      # From service account JSON
STRIPE_SECRET_KEY          # sk_test_... or sk_live_...
STRIPE_PUBLISHABLE_KEY     # pk_test_... or pk_live_...
JWT_SECRET                 # For additional JWT signing
FRONTEND_URL               # For CORS configuration
```

### Optional Variables
```env
SERVICE_FEE_PERCENTAGE     # Default 10
SERVICE_FEE_MIN           # Default 0.25
SERVICE_FEE_MAX           # Default 2.00
LOG_LEVEL                 # debug, info, warn, error
FCM_PROJECT_ID            # For notifications
FCM_CREDENTIALS_PATH      # Path to FCM JSON
```

## Security Measures

1. **Authentication**
   - Firebase token verification on protected routes
   - No password storage (delegated to Firebase)

2. **Authorization**
   - User can only access own resources (vehicles, sessions, payments)
   - Query filters by user_id

3. **Data Protection**
   - HTTPS recommended (enforce in production)
   - Helmet security headers (HSTS, CSP, etc.)
   - CORS restricted to frontend domain

4. **Injection Prevention**
   - Parameterized SQL queries (no string concatenation)
   - Input validation on all endpoints
   - Type safety via TypeScript

5. **Rate Limiting**
   - Ready for express-rate-limit middleware
   - Per-user quotas possible via database

## Scalability Considerations

### Horizontal Scaling
- Stateless API (no session affinity needed)
- PostgreSQL connection pooling
- Load balancer distributes requests
- Database as single source of truth

### Database Optimization
- Proper indexing for common queries
- Connection pooling (20 connections default)
- Prepared statements via parameterized queries
- PostGIS GIST indexes for geospatial queries

### Caching Opportunities
- Zone data (rarely changes, cache 24h)
- User profile (cache until logout)
- Payment methods (cache user session)
- Parking rate calculations (cache per zone)

## Monitoring & Logging

### Application Logs
- Morgan middleware logs all HTTP requests
- Console logs for database queries
- Error stack traces in development

### Metrics to Track
- Request count and latency
- Database query performance
- Payment success rate
- Error frequency by endpoint
- Zone popularity (queries)

### Health Checks
```
GET /health → { status: 'ok', timestamp: '2024-01-01T00:00:00Z' }
```

## Testing Strategy

### Unit Tests
- Service layer functions (parking.ts)
  - calculateParkingCost()
  - calculateServiceFee()
  - isZoneActiveNow()

### Integration Tests
- Route handlers with mocked database
- Authentication with Firebase emulator
- Stripe webhook handlers

### E2E Tests
- Full parking session flow
- Vehicle management
- Analytics export

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment-Specific Setup
- Development: SQLite optional, hot reload
- Staging: Production database, test Stripe
- Production: Full PostgreSQL, live Stripe keys

## Future Enhancements

1. **Webhooks**
   - Stripe event webhooks (payment confirmation)
   - FCM token refresh webhooks

2. **Real-time Features**
   - WebSocket for live session updates
   - Real-time parking zone availability

3. **Advanced Analytics**
   - Machine learning for parking predictions
   - Zone popularity trends

4. **Internationalization**
   - Multi-city expansion
   - Multiple currencies

5. **Mobile App Features**
   - QR code for session verification
   - NFC/Bluetooth parking entrance integration

## Conclusion

The ParkFree backend is designed for:
- **Performance**: Optimized queries, connection pooling
- **Reliability**: ACID transactions, error handling
- **Scalability**: Stateless design, horizontal scaling
- **Security**: Authentication, authorization, input validation
- **Maintainability**: TypeScript, modular structure, clear separation of concerns
- **Developer Experience**: Hot reload, comprehensive logging, complete documentation
