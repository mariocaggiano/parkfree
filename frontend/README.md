# ParkFree - Parking Payment App

A modern, mobile-first React + TypeScript web application for street parking payments in Italian cities (strisce blu).

## Features

- **Interactive Map**: Browse parking zones with Mapbox integration
- **Real-time Booking**: Select zones, choose duration, and park instantly
- **Active Session Tracking**: Circular timer showing remaining parking time
- **Vehicle Management**: Add and manage multiple vehicles
- **Parking History**: View past sessions with detailed receipts
- **Spending Analytics**: Visualize spending patterns with charts
- **Multi-Auth**: Email, Google, Apple, and phone number authentication
- **Payment Methods**: Secure card management with Stripe integration
- **Responsive Design**: Mobile-first, works on all devices

## Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Authentication**: Firebase Auth
- **Maps**: Mapbox GL
- **Charts**: Recharts
- **UI Icons**: Lucide React
- **Styling**: Custom CSS with CSS Variables
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Payment**: Stripe (integration ready)

## Project Structure

```
parkfree/frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx              # Bottom navigation bar
│   │   ├── Map.tsx                 # Mapbox map component
│   │   ├── ParkingCard.tsx        # Zone selection & booking
│   │   ├── ActiveSession.tsx      # Active session overlay
│   │   └── SessionTimer.tsx       # Circular countdown timer
│   ├── pages/
│   │   ├── HomePage.tsx            # Main map view
│   │   ├── LoginPage.tsx          # Authentication
│   │   ├── RegisterPage.tsx       # User registration
│   │   ├── VehiclesPage.tsx       # Vehicle management
│   │   ├── HistoryPage.tsx        # Parking history
│   │   ├── AnalyticsPage.tsx      # Spending dashboard
│   │   └── ProfilePage.tsx        # User profile & settings
│   ├── services/
│   │   ├── api.ts                 # Axios instance & endpoints
│   │   └── auth.ts                # Firebase authentication
│   ├── hooks/
│   │   └── useAuth.ts             # Auth context & hook
│   ├── styles/
│   │   └── globals.css            # 400+ lines of CSS
│   ├── utils/
│   │   └── formatters.ts          # Utility functions
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── App.tsx                     # Main app with routes
│   └── main.tsx                    # React entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Installation

1. **Clone the repository** (if not already done)
   ```bash
   cd /sessions/vigilant-funny-mendel/parkfree/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file** (.env.local)
   ```
   VITE_API_URL=http://localhost:8000/api
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   ```

## Development

Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Build

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Configuration

### Mapbox Token
Replace the token in `src/components/Map.tsx`:
```typescript
const MAPBOX_TOKEN = 'your_actual_mapbox_token_here'
```

### Firebase Config
Update Firebase credentials in `src/services/auth.ts` with your project details.

### API Base URL
Set `VITE_API_URL` in `.env.local` to point to your backend API.

## CSS Design System

The app uses a comprehensive CSS system with:
- **Color Variables**: Primary (#2E86C1), Accent (#27AE60), Dark (#1A1A1A)
- **Spacing Scale**: From xs (0.25rem) to 4xl (4rem)
- **Typography**: Professional system with 8 font sizes
- **Components**: Buttons, forms, cards, modals, badges, chips
- **Animations**: Smooth transitions, pulse effects, spin loader
- **Responsive**: Mobile-first, tablet, and desktop layouts
- **Dark Mode**: Automatic color scheme preference support

## Key Features

### 1. Authentication
- Email/password login and registration
- Google OAuth integration
- Apple Sign-in
- Phone number + OTP verification
- Firebase-based token management

### 2. Home/Map Page
- Interactive Mapbox showing parking zones
- Zone selection with immediate booking
- Active session overlay with circular timer
- Geolocation support

### 3. Vehicle Management
- Add multiple vehicles
- Edit vehicle details
- Set default vehicle and badge type
- Delete vehicles

### 4. Parking History
- View all past parking sessions
- Filter by time period (week, month, year)
- Expandable session details
- Receipt download (placeholder)

### 5. Analytics Dashboard
- Monthly spending bar chart
- Top zones pie chart
- Summary statistics
- Monthly spending trends

### 6. Profile & Settings
- User information editing
- Payment method management
- Account settings
- Logout functionality

## API Integration

The app is configured to work with a RESTful backend. See `src/services/api.ts` for available endpoints:

```typescript
// Parking zones
GET /api/zones
GET /api/zones/:id
GET /api/zones/search?latitude=...&longitude=...&radius=...

// Parking sessions
POST /api/sessions
GET /api/sessions
GET /api/sessions/active
PATCH /api/sessions/:id/extend
POST /api/sessions/:id/end

// Vehicles
GET /api/vehicles
POST /api/vehicles
PUT /api/vehicles/:id
DELETE /api/vehicles/:id

// Analytics
GET /api/analytics/spending
GET /api/analytics/stats
GET /api/analytics/top-zones
```

## Responsive Breakpoints

- **Mobile**: < 640px (primary target)
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- Code splitting with React Router
- Lazy loading of components
- Optimized CSS with variables
- Image optimization ready
- Service worker ready (PWA)

## Accessibility

- WCAG 2.1 Level AA compliance
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Reduced motion support
- High contrast mode support

## Future Enhancements

- [ ] React Native mobile app (code reuse)
- [ ] Offline mode with service workers
- [ ] Real-time notifications
- [ ] Recurring parking presets
- [ ] Car sharing integration
- [ ] Multi-language support
- [ ] Dark mode UI toggle

## Contributing

Instructions for contributing to the project.

## License

MIT License - see LICENSE file for details

## Support

For support, contact: support@parkfree.app

---

Built with React + TypeScript + Vite
