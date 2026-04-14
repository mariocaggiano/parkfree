# ParkFree Backend

A production-quality Node.js + Express + TypeScript backend for the ParkFree parking payment app. The API enables users to manage parking sessions, vehicles, and payments for Italian street parking (strisce blu).

## Features

- **User Management**: Registration, login, social authentication via Firebase
- **Vehicle Management**: Add, manage, and select default vehicles
- **Parking Zones**: Browse zones with location-based search (PostGIS)
- **Parking Sessions**: Start, extend, and complete parking sessions
- **Payments**: Stripe integration for payment processing with service fees
- **Analytics**: Spending summaries and CSV export
- **Notifications**: Integration-ready FCM support for push notifications
- **Security**: Firebase authentication, JWT tokens, CORS, helmet protection

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with PostGIS
- **Auth**: Firebase Admin SDK
- **Payments**: Stripe
- **Development**: ts-node, nodemon, TypeScript compiler

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+ with PostGIS extension
- Firebase project with Admin SDK credentials
- Stripe account with API keys
- Git

## Installation

### 1. Clone and Install Dependencies

```bash
cd parkfree/backend
npm install
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/parkfree_db

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# JWT
JWT_SECRET=your-secret-key

# App URLs
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup

Create the database and load the schema:

```bash
createdb parkfree_db
psql parkfree_db < src/models/schema.sql
```

The schema includes:
- PostGIS extension for geographical queries
- Users, vehicles, parking zones, sessions, and payment methods tables
- Seed data for 5 Milan parking zones
- Automatic timestamp management with triggers

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing
3. Generate a service account key (Project Settings → Service Accounts)
4. Save as `firebase-service-account.json` or set env vars

### 5. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get API keys from the Dashboard
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env`

## Development

### Start Development Server

```bash
npm run dev
```

The server runs with hot-reload on http://localhost:3000

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login with Firebase token |
| POST | `/social-login` | Social login / auto-register |

### Users (`/api/users`) - Protected

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update user profile |

### Vehicles (`/api/vehicles`) - Protected

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user vehicles |
| POST | `/` | Create new vehicle |
| PUT | `/:id` | Update vehicle |
| DELETE | `/:id` | Delete vehicle |

### Zones (`/api/zones`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List zones near location (lat, lng, radius params) |
| GET | `/:id` | Get zone details |

### Sessions (`/api/sessions`) - Protected

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Start new parking session |
| GET | `/` | List user sessions (paginated) |
| GET | `/:id` | Get session details |
| GET | `/:id/receipt` | Get session receipt |
| PUT | `/:id/extend` | Extend parking duration |
| PUT | `/:id/stop` | End parking session |

### Payments (`/api/payments`) - Protected

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List payment methods |
| POST | `/` | Add payment method |
| POST | `/setup-intent` | Create Stripe setup intent |
| DELETE | `/:id` | Remove payment method |

### Analytics (`/api/analytics`) - Protected

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/spending` | Get spending analytics |
| GET | `/export` | Export sessions as CSV |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status |

## API Usage Examples

### 1. Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "firebase-id-token",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+39 123 456 7890"
  }'
```

### 2. Start Parking Session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Authorization: Bearer firebase-id-token" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "vehicle-uuid",
    "zoneId": "zone-uuid",
    "durationMinutes": 120,
    "paymentMethodId": "pm_stripe-id"
  }'
```

### 3. Find Parking Zones

```bash
curl "http://localhost:3000/api/zones?lat=45.4642&lng=9.1826&radius=1000"
```

### 4. Extend Parking

```bash
curl -X PUT http://localhost:3000/api/sessions/session-uuid/extend \
  -H "Authorization: Bearer firebase-id-token" \
  -H "Content-Type: application/json" \
  -d '{
    "extensionMinutes": 60,
    "paymentMethodId": "pm_stripe-id"
  }'
```

### 5. Get Spending Analytics

```bash
curl "http://localhost:3000/api/analytics/spending?period=monthly&months=6" \
  -H "Authorization: Bearer firebase-id-token"
```

## Database Schema

### Users
- Stores user profiles, Firebase UID, email, phone, Stripe customer ID

### Vehicles
- User vehicles with license plates, names, default vehicle tracking

### Parking Zones
- Geographic zones with hourly rates, duration limits, free hours, active hours
- PostGIS geometry for spatial queries

### Parking Sessions
- Tracks parking duration, costs, service fees, payment status
- Supports auto-extend and early termination with refunds

### Payment Methods
- Stores Stripe payment method references with card details

## Key Business Logic

### Service Fee Calculation
- Formula: max(min_fee, min(percentage * parking_cost, max_fee))
- Default: 10% of parking cost, min €0.25, max €2.00
- Configurable via environment variables

### Parking Cost
- Hourly rate from zone definition
- Rounded up to nearest hour
- Formula: hourly_rate × ceil(duration_minutes / 60)

### Zone Availability
- Active only during configured hours
- Free parking during configured free_hours
- Respects maximum duration limits

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

All errors include a JSON error response:

```json
{
  "error": "Error message"
}
```

## Middleware

- **CORS**: Configured for frontend URL from env
- **Helmet**: Security headers
- **Morgan**: HTTP request logging
- **Auth Middleware**: Firebase token verification for protected routes
- **Optional Auth**: Allows authenticated or unauthenticated access

## Deployment

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production

- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure `DATABASE_URL` to production PostgreSQL
- Set production Firebase and Stripe keys
- Configure `FRONTEND_URL` for CORS

## Monitoring

- Morgan logs all HTTP requests
- Console logs for database queries
- Error tracking and logging ready for Sentry integration
- Health check endpoint at `/health`

## Security Features

- Firebase authentication for user verification
- CORS protection
- Helmet security headers
- Input validation on all endpoints
- SQL injection prevention via parameterized queries
- Stripe webhook validation ready
- Environment variable protection

## Future Enhancements

- Webhook handlers for Stripe events
- FCM push notifications implementation
- Rate limiting and throttling
- Request validation middleware
- API key authentication alternative
- WebSocket for real-time updates
- Cron jobs for session expiry checks
- Advanced analytics and reporting

## License

ISC

## Support

For issues or questions, refer to the documentation or contact the development team.
