# ParkFree - Quick Start Guide

## Overview

ParkFree is a production-ready parking payment app built with React, TypeScript, and Vite. It's designed for Italian street parking (strisce blu) with a modern, mobile-first interface.

## File Structure Summary

### Core Files
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `index.html` - HTML entry point with Italian language

### Source Code (src/)

#### Components (`src/components/`)
1. **Navbar.tsx** - Bottom navigation with 5 tabs (Map, Car, History, Analytics, Profile)
2. **Map.tsx** - Mapbox GL integration for zone visualization
3. **ParkingCard.tsx** - Slide-up card for zone booking
4. **ActiveSession.tsx** - Full-screen overlay for active parking
5. **SessionTimer.tsx** - Animated circular countdown timer

#### Pages (`src/pages/`)
1. **HomePage.tsx** - Main view with map and booking
2. **LoginPage.tsx** - Email, Google, Apple, and phone auth
3. **RegisterPage.tsx** - User registration form
4. **VehiclesPage.tsx** - Vehicle management (add/edit/delete)
5. **HistoryPage.tsx** - Scrollable parking history with filters
6. **AnalyticsPage.tsx** - Spending dashboard with Recharts
7. **ProfilePage.tsx** - User profile and payment methods

#### Services (`src/services/`)
1. **auth.ts** - Firebase authentication service
   - Email/password auth
   - Google OAuth
   - Apple Sign-in
   - Phone OTP verification

2. **api.ts** - Axios API client
   - Auth token interceptor
   - All endpoint definitions
   - Error handling

#### Hooks (`src/hooks/`)
- **useAuth.ts** - Auth context and custom hook

#### Utilities
- **src/utils/formatters.ts** - Currency, duration, date formatters
- **src/types/index.ts** - TypeScript interfaces (User, Vehicle, ParkingSession, etc.)
- **src/styles/globals.css** - 1250+ lines of CSS with full design system

## Color Scheme

```css
Primary:      #2E86C1 (Blue - main brand color)
Accent:       #27AE60 (Green - success/active)
Dark:         #1A1A1A (Text)
Light:        #F8F9FA (Background)
Error:        #E74C3C (Red)
Warning:      #F39C12 (Orange)
```

## Key Features Implemented

### Authentication
- Multi-method login (Email, Google, Apple, Phone)
- Firebase token-based auth
- Protected routes with AuthProvider

### Home Page
- Interactive Mapbox map
- Zone markers and polygons
- Auto-detection of user location
- Slide-up booking card
- Active session overlay

### Booking Flow
1. Select zone on map
2. Choose duration with slider
3. Select vehicle
4. See cost breakdown
5. Confirm booking

### Active Session
- Circular progress timer
- Real-time cost calculation
- Extend or end session buttons
- Pulse animation when < 5 min left

### Vehicle Management
- Add vehicles with license plate
- Set aliases and badge types
- Edit and delete vehicles
- Make vehicle default

### History
- Filterable by time period
- Expandable session details
- Cost breakdown per session
- Receipt download (placeholder)

### Analytics
- Monthly spending bar chart
- Top zones pie chart
- Summary statistics cards
- Year-over-year trends

### Profile
- User information display
- Payment method management
- Add/remove credit cards
- Set default payment method
- Logout button

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env.local`:
```env
VITE_API_URL=http://localhost:8000/api
VITE_MAPBOX_TOKEN=your_token_here
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Start Development Server
```bash
npm run dev
```
Opens at `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
```
Output goes to `dist/` folder

## Important Notes

### Mapbox Token
- Located in `src/components/Map.tsx` (line ~17)
- Replace placeholder with your actual token
- Get from https://www.mapbox.com/

### Firebase Setup
- All config in `src/services/auth.ts`
- Update with your Firebase project credentials
- Enable auth methods: Email/Password, Google, Apple

### API Integration
- Backend endpoints defined in `src/services/api.ts`
- Currently uses Axios with Firebase token interceptor
- Replace API_BASE_URL for your backend

### Payment Integration
- Stripe ready in package.json
- Not implemented in UI yet - add your Stripe key
- Use `@stripe/react-stripe-js` components

## Responsive Design

### Mobile (< 640px)
- Bottom navbar with 5 tabs
- Full-width pages
- Slide-up modals

### Tablet (640px - 1024px)
- Adjusted layouts
- Responsive grids

### Desktop (> 1024px)
- Sidebar navbar
- Wider containers
- Enhanced spacing

## CSS Classes & Components

### Buttons
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-accent">Accent</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-sm">Small</button>
<button class="btn btn-lg">Large</button>
```

### Forms
```html
<input class="form-input" />
<select class="form-select"></select>
<textarea class="form-textarea"></textarea>
<label class="form-label">Label</label>
```

### Cards
```html
<div class="card">Card content</div>
<div class="card-header">Header</div>
<div class="card-body">Body</div>
<div class="card-footer">Footer</div>
```

### Modals
```html
<div class="modal-overlay">
  <div class="modal-content">Modal content</div>
</div>
```

### Utilities
```html
<div class="flex gap-md items-center">...</div>
<div class="grid grid-cols-2">...</div>
<p class="text-primary text-bold">...</p>
<div class="shadow-lg rounded-xl">...</div>
```

## Animations

- **Slide Up**: `.slide-up-card`, `.modal-overlay`
- **Pulse**: `.animate-pulse`, `.timer-pulse`
- **Spin**: `.animate-spin`, `.spinner`
- **Smooth Transitions**: All interactive elements

## Accessibility Features

- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- High contrast mode compatible
- Reduced motion support
- Mobile viewport meta tags

## Testing Accounts (Mock Data)

The app includes mock data for:
- Sample parking zones (Piazza Navona, Colosseo)
- Sample vehicle (AA123BB)
- Sample payment methods
- Sample parking history

Replace with real data from your backend.

## Common Tasks

### Add a New Page
1. Create `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation in `src/components/Navbar.tsx`

### Customize Colors
Edit CSS variables in `src/styles/globals.css` (lines 1-30)

### Modify API Endpoints
Update `src/services/api.ts` functions

### Change Authentication
Update `src/services/auth.ts` providers

### Add Charts
Use Recharts components (already installed)

## Performance Tips

1. Lazy load components with React.lazy()
2. Memoize expensive components with React.memo()
3. Use useCallback for event handlers
4. Optimize images for mobile
5. Minify CSS/JS in production (Vite does this)

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### GitHub Pages
```bash
npm run build
# Deploy dist/ folder
```

### Self-Hosted
```bash
npm run build
# Upload dist/ to your server
```

## Troubleshooting

### Mapbox not showing
- Check token in Map.tsx
- Verify token permissions in Mapbox dashboard
- Check browser console for errors

### Firebase errors
- Verify credentials in auth.ts
- Check Firebase console for enabled auth methods
- Clear browser localStorage if issues persist

### API errors
- Verify backend is running
- Check VITE_API_URL in .env.local
- Ensure Firebase token is valid

### Styling issues
- Clear browser cache
- Check CSS specificity
- Use browser DevTools to inspect styles

## Support Resources

- React Docs: https://react.dev
- TypeScript: https://www.typescriptlang.org
- Vite: https://vitejs.dev
- Firebase: https://firebase.google.com/docs
- Mapbox: https://docs.mapbox.com
- Recharts: https://recharts.org
- Lucide Icons: https://lucide.dev

## License

MIT License

---

**Ready to code!** Start with `npm run dev` and open your browser to http://localhost:3000
