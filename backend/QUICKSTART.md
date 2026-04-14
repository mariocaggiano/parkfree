# ParkFree Backend - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd parkfree/backend
npm install
```

### 2. Setup Database
```bash
# Create database
createdb parkfree_db

# Load schema (creates tables, indexes, seed data)
psql parkfree_db < src/models/schema.sql
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials:
# - FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
# - STRIPE_SECRET_KEY
# - DATABASE_URL (if not default)
```

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000/health to verify server is running.

## Testing Key Features

### 1. Test Health Endpoint
```bash
curl http://localhost:3000/health
```

### 2. List Milan Parking Zones
```bash
# Get zones near Duomo (center of Milan)
curl "http://localhost:3000/api/zones?lat=45.4642&lng=9.1826&radius=2000"
```

### 3. Get Zone Details
```bash
# First, get a zone ID from the list above, then:
curl "http://localhost:3000/api/zones/{zone-id}"
```

## Project Structure

```
parkfree/backend/
├── src/
│   ├── config/              # Config files (database, firebase, stripe)
│   ├── middleware/          # Express middleware (auth)
│   ├── models/              # Database schema
│   ├── routes/              # API endpoints
│   │   ├── auth.ts          # Auth endpoints
│   │   ├── users.ts         # User profile management
│   │   ├── vehicles.ts      # Vehicle CRUD
│   │   ├── zones.ts         # Parking zones (geolocation)
│   │   ├── sessions.ts      # Parking sessions (main feature)
│   │   ├── payments.ts      # Payment methods
│   │   └── analytics.ts     # Spending and reports
│   ├── services/            # Business logic
│   │   ├── parking.ts       # Parking cost calculations, zone logic
│   │   └── notifications.ts # Push notifications
│   └── index.ts             # Main app entry point
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── nodemon.json             # Development watch config
└── README.md                # Full documentation
```

## Key Files to Understand

1. **src/index.ts** - Express app setup, route mounting, error handling
2. **src/routes/sessions.ts** - Core parking session logic (most complex)
3. **src/services/parking.ts** - Cost calculations and zone business logic
4. **src/models/schema.sql** - Database schema with 5 Milan zones

## Development Commands

```bash
npm run dev       # Start with hot-reload (nodemon)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled JavaScript
```

## Common Tasks

### Add a New Parking Zone
```sql
INSERT INTO parking_zones (city_code, zone_code, name, geometry, hourly_rate)
VALUES ('MI', 'F', 'New Zone', ST_PolygonFromText('POLYGON(...)', 4326), 2.50);
```

### Check Database
```bash
psql parkfree_db
\dt                    # List tables
SELECT * FROM users;   # Query users
\q                     # Exit
```

### View Logs
Development logs show in terminal. Production: check /var/log or cloud logs.

## Troubleshooting

### "Database connection failed"
- Verify PostgreSQL is running: `psql -l`
- Check DATABASE_URL in .env
- Ensure database exists: `createdb parkfree_db`

### "Firebase authentication error"
- Verify FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL in .env
- Download fresh service account JSON from Firebase Console

### "Stripe error"
- Verify STRIPE_SECRET_KEY starts with `sk_test_` or `sk_live_`
- Check Stripe dashboard for API key validity

### Port already in use
- Change PORT in .env (default 3000)
- Or kill existing process: `lsof -ti:3000 | xargs kill`

## Production Deployment

1. Build: `npm run build`
2. Set `NODE_ENV=production`
3. Use production database URL
4. Set production Firebase and Stripe keys
5. Configure FRONTEND_URL for CORS
6. Run: `npm start` or use PM2/Docker

## API Endpoints Reference

**Public:**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/social-login` - Social login
- `GET /api/zones` - List zones (location-based)
- `GET /api/zones/:id` - Zone details
- `GET /health` - Health check

**Protected (require Firebase auth token):**
- `GET /api/users/me` - Profile
- `PUT /api/users/me` - Update profile
- `GET/POST/PUT/DELETE /api/vehicles` - Vehicle management
- `GET/POST/PUT/:id/extend/stop /api/sessions` - Parking sessions
- `GET/POST/DELETE /api/payments` - Payment methods
- `GET /api/analytics/spending` - Spending stats
- `GET /api/analytics/export` - CSV export

## Next Steps

1. Create Firebase project and get credentials
2. Create Stripe account and get API keys
3. Add credentials to .env
4. Start the dev server
5. Test with curl or Postman
6. Build frontend to consume API
7. Deploy with Docker/PM2/Cloud provider

## Support

Refer to README.md for detailed documentation.
Check individual route files for endpoint-specific logic.
