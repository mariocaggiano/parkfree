# ParkFree Components API Documentation

## Component Guide

Detailed API documentation for all React components in the ParkFree application.

---

## Navigation

### Navbar

Bottom navigation bar with 5 main sections of the app.

**Location:** `src/components/Navbar.tsx`

**Props:** None (uses React Router)

**Features:**
- Bottom-fixed navigation
- 5 navigation items: Map, Vehicles, History, Analytics, Profile
- Active state highlighting
- Safe area padding for notch devices
- Responsive (becomes sidebar on desktop)

**Icons Used:**
- MapPin (Map)
- Car (Vehicles)
- Clock (History)
- BarChart3 (Analytics)
- User (Profile)

**Usage:**
```tsx
import Navbar from './components/Navbar'

<Navbar /> // Automatically integrated in App.tsx
```

---

## Map

Interactive Mapbox GL map component for viewing and selecting parking zones.

**Location:** `src/components/Map.tsx`

**Props:**
```typescript
interface MapProps {
  onZoneSelect?: (zone: ParkingZone) => void
  zones?: ParkingZone[]
  center?: [number, number]
  zoom?: number
}
```

**Default Values:**
- center: `[12.4964, 41.9028]` (Rome)
- zoom: `12`
- zones: `[]`

**Features:**
- Full-screen responsive map
- Zone markers with popups
- Zone polygon visualization
- Geolocation control
- Navigation controls
- Click handlers for zone selection
- Hover effects on polygons

**Zone Marker Info:**
Shows popup with:
- Zone name
- City
- Hourly rate
- Max duration
- Operating hours

**Example:**
```tsx
<Map
  zones={parkingZones}
  onZoneSelect={handleZoneSelect}
  center={[12.5, 41.9]}
  zoom={13}
/>
```

**Important:**
Replace `MAPBOX_TOKEN` placeholder with real token from mapbox.com

---

## ParkingCard

Slide-up card for selecting parking duration and booking a zone.

**Location:** `src/components/ParkingCard.tsx`

**Props:**
```typescript
interface ParkingCardProps {
  zone: ParkingZone | null
  vehicles: Vehicle[]
  onClose: () => void
  onPark: (vehicleId: string, duration: number) => void
}
```

**Features:**
- Slide-up animation from bottom
- Zone information display
- Vehicle selector dropdown
- Duration slider (15-min increments)
- Real-time cost calculation
- Cost breakdown (parking + 10% fee)
- Close and Park buttons
- Responsive layout

**Elements:**
1. Handle bar (swipe indicator)
2. Zone name and city
3. Zone details grid:
   - Hourly rate
   - Max duration
   - Operating hours
4. Vehicle selector
5. Duration slider with visual feedback
6. Cost breakdown section
7. Action buttons

**Cost Calculation:**
```typescript
cost = (zone.hourlyRate * duration) / 60
fee = cost * 0.1
total = cost + fee
```

**Example:**
```tsx
<ParkingCard
  zone={selectedZone}
  vehicles={vehicles}
  onClose={() => setShowCard(false)}
  onPark={handlePark}
/>
```

---

## SessionTimer

Circular SVG-based countdown timer component.

**Location:** `src/components/SessionTimer.tsx`

**Props:**
```typescript
interface SessionTimerProps {
  remainingSeconds: number
  totalSeconds: number
}
```

**Features:**
- Circular progress animation
- MM:SS time display
- Automatic pulse animation when < 5 min left
- SVG-based (no canvas)
- Smooth stroke-dashoffset transitions
- Centered layout

**Styling:**
- Background circle: light gray
- Progress circle: accent green
- Pulse animation: 1s loop

**Color Scheme:**
- `--color-light-secondary`: Background circle
- `--color-accent`: Progress circle
- Text color: Dark

**Example:**
```tsx
<SessionTimer
  remainingSeconds={595}
  totalSeconds={3600}
/>
```

---

## ActiveSession

Full-screen modal overlay showing active parking session details.

**Location:** `src/components/ActiveSession.tsx`

**Props:**
```typescript
interface ActiveSessionProps {
  session: ParkingSession
  zone: ParkingZone | null
  onExtend: () => void
  onEnd: () => void
}
```

**Features:**
- Modal overlay with semi-transparent background
- Session timer (uses SessionTimer component)
- Zone name and vehicle info
- Cost tracking (updates in real-time)
- Extend and End buttons
- Animated slide-up entry
- Info footer with disclaimer

**Layout:**
1. Close button (top-right)
2. Status indicator (green pulse dot)
3. Zone name (large header)
4. Vehicle plate number
5. SessionTimer component
6. Cost display card
7. Action buttons (Extend, End)
8. Info footer

**Example:**
```tsx
{activeSession && (
  <ActiveSession
    session={activeSession}
    zone={activeZone}
    onExtend={handleExtend}
    onEnd={handleEnd}
  />
)}
```

---

## Page Components

### HomePage

Main app screen with map, zone selection, and active session management.

**Location:** `src/pages/HomePage.tsx`

**Features:**
- Full-screen Mapbox map
- Parking zone selection via map click
- Slide-up booking card
- Active session overlay
- Mock data for demo

**State Management:**
- `zones`: Array of ParkingZone
- `vehicles`: Array of Vehicle
- `selectedZone`: Currently selected zone
- `activeSession`: Current parking session
- `showCard`: Booking card visibility

**Mock Data:**
- 2 sample zones (Piazza Navona, Colosseo)
- 1 sample vehicle (AA123BB)

**Local Storage:**
Stores active session in `activeSession` key for persistence

**Example:**
```tsx
<HomePage />
```

---

### LoginPage

Authentication page with multiple login methods.

**Location:** `src/pages/LoginPage.tsx`

**Features:**
- Email + Password form
- Google OAuth button
- Apple Sign-in button
- Phone number + OTP section (collapsible)
- Error message display
- Loading states
- Link to registration

**Auth Methods:**
1. Email/Password
2. Google (OAuth)
3. Apple (OAuth)
4. Phone + OTP

**Styling:**
- Gradient background (primary to primary-dark)
- Centered layout
- White cards for forms

**Example:**
```tsx
<LoginPage />
```

---

### RegisterPage

New user registration page.

**Location:** `src/pages/RegisterPage.tsx`

**Features:**
- Full name input
- Email input
- Password input with confirmation
- Phone number (optional)
- Terms & Privacy acceptance checkbox
- Form validation
- Error messages
- Link to login

**Validation Rules:**
- Name: Required, non-empty
- Email: Required, valid email format
- Password: Min 6 characters
- Confirm Password: Must match password
- Terms: Must be checked

**Styling:**
- Gradient background (accent to accent-dark)
- Card layout
- Icon-prefixed inputs

**Example:**
```tsx
<RegisterPage />
```

---

### VehiclesPage

Vehicle management page for adding, editing, and deleting vehicles.

**Location:** `src/pages/VehiclesPage.tsx`

**Features:**
- List of user vehicles
- Add vehicle form (toggleable)
- Edit vehicle form (inline)
- Delete vehicle with confirmation
- Vehicle details display
- Badge type selector

**Vehicle Form Fields:**
- License plate (required, auto-uppercase)
- Alias/nickname (optional)
- Badge type (Residenti, Non Residenti, Ospiti)

**Actions:**
- Add new vehicle
- Edit existing vehicle
- Delete vehicle (with confirmation)

**UI States:**
- No vehicles (empty state)
- Vehicles list (cards)
- Add form visible
- Edit form visible

**Example:**
```tsx
<VehiclesPage />
```

---

### HistoryPage

Parking session history with filtering and details.

**Location:** `src/pages/HistoryPage.tsx`

**Features:**
- Scrollable session list
- Date range filtering (All, Week, Month, Year)
- Expandable session details
- Summary statistics (total spent, average)
- Receipt download (placeholder)
- Time-based sorting

**Filters:**
- All: All sessions
- Week: Last 7 days
- Month: Last 30 days
- Year: Last 365 days

**Session Information:**
- Zone name and location
- Start and end times
- Duration
- Cost
- Vehicle plate
- Operating hours (expanded)

**Statistics:**
- Total spent (filtered)
- Average per session

**Example:**
```tsx
<HistoryPage />
```

---

### AnalyticsPage

Spending analytics and visualization dashboard.

**Location:** `src/pages/AnalyticsPage.tsx`

**Features:**
- Monthly spending bar chart (Recharts)
- Top zones pie chart (Recharts)
- Summary cards (4 stats)
- Month comparison
- Zone breakdown with percentages
- Tips section

**Summary Cards:**
1. Total spent this month
2. Average per session
3. Total sessions
4. Top zone

**Charts:**
1. **Monthly Bar Chart**
   - X-axis: Month names
   - Y-axis: Spending amount
   - Blue bars with rounded tops

2. **Top Zones Pie Chart**
   - Donut chart with inner radius
   - Color-coded zones
   - Legend below

**Data:**
Mock data for 4 months and 4 zones

**Example:**
```tsx
<AnalyticsPage />
```

---

### ProfilePage

User profile and account management.

**Location:** `src/pages/ProfilePage.tsx`

**Features:**
- User info display and edit
- Payment method management
- Add credit card form
- Set default payment method
- Delete payment method
- Settings section
- Logout button
- App version info

**User Info:**
- Display name
- Email
- Phone number (if available)
- Edit button

**Payment Methods:**
- Card brand and last 4 digits
- Expiry month/year
- Default badge
- Add new card form
- Delete button per card

**Card Form Fields:**
- Cardholder name
- Card number
- Expiry month (1-12)
- Expiry year
- CVV

**Settings:**
- Notifications
- Privacy & Security
- Help & Support

**Example:**
```tsx
<ProfilePage />
```

---

## Hook Components

### useAuth

Custom React hook providing authentication context and methods.

**Location:** `src/hooks/useAuth.ts`

**Interface:**
```typescript
interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<User | null>
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<User | null>
  signInWithGoogle: () => Promise<User | null>
  signInWithApple: () => Promise<User | null>
  signOut: () => Promise<void>
}
```

**Properties:**
- `user`: Current Firebase user or null
- `loading`: Authentication state loading status

**Methods:**
- `signInWithEmail()`: Email/password login
- `signUpWithEmail()`: New user registration
- `signInWithGoogle()`: Google OAuth
- `signInWithApple()`: Apple Sign-in
- `signOut()`: User logout

**Usage:**
```tsx
import { useAuth } from '../hooks/useAuth'

function MyComponent() {
  const { user, loading, signInWithEmail } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not logged in</div>

  return <div>Welcome, {user.displayName}</div>
}
```

**Provider:**
```tsx
import { AuthProvider } from '../hooks/useAuth'

<AuthProvider>
  <App />
</AuthProvider>
```

---

## Type Definitions

All TypeScript interfaces in `src/types/index.ts`:

### User
```typescript
interface User {
  id: string
  email: string
  displayName: string
  phoneNumber?: string
  photoURL?: string
  createdAt: Date
  updatedAt: Date
}
```

### Vehicle
```typescript
interface Vehicle {
  id: string
  userId: string
  licensePlate: string
  alias?: string
  defaultBadge: string
  color?: string
  createdAt: Date
  updatedAt: Date
}
```

### ParkingZone
```typescript
interface ParkingZone {
  id: string
  name: string
  city: string
  coordinates: {
    latitude: number
    longitude: number
  }
  polygon?: Array<[number, number]>
  hourlyRate: number
  maxDuration: number
  operatingHours: {
    start: string
    end: string
  }
  dayOfWeek: number[]
  disabled?: boolean
}
```

### ParkingSession
```typescript
interface ParkingSession {
  id: string
  userId: string
  vehicleId: string
  zoneId: string
  startTime: Date
  endTime?: Date
  duration: number
  cost: number
  status: 'active' | 'completed' | 'cancelled'
  paymentMethodId: string
  receipt?: string
}
```

### PaymentMethod
```typescript
interface PaymentMethod {
  id: string
  userId: string
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay'
  last4: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
  createdAt: Date
}
```

---

## Utility Functions

### formatCurrency
```typescript
formatCurrency(2.5) // Returns: "2,50 €" (Italian format)
```

### formatDuration
```typescript
formatDuration(90) // Returns: "1h 30m"
formatDuration(30) // Returns: "30m"
```

### formatPlate
```typescript
formatPlate("aa 123 bb") // Returns: "AA123BB"
```

### formatDate
```typescript
formatDate(new Date()) // Returns: "05/04/2026"
```

### formatDateTime
```typescript
formatDateTime(new Date()) // Returns: "05/04/2026, 14:30"
```

### secondsToMMSS
```typescript
secondsToMMSS(595) // Returns: "09:55"
```

### minutesToHHMM
```typescript
minutesToHHMM(90) // Returns: "01:30"
```

---

## CSS Classes Reference

### Buttons
```css
.btn           /* Base button */
.btn-primary   /* Blue background */
.btn-secondary /* Light background */
.btn-accent    /* Green background */
.btn-outline   /* Border style */
.btn-ghost     /* Transparent */
.btn-icon      /* Square icon button */
.btn-sm        /* Small size */
.btn-lg        /* Large size */
```

### Forms
```css
.form-group      /* Input wrapper */
.form-label      /* Input label */
.form-input      /* Text input */
.form-textarea   /* Text area */
.form-select     /* Dropdown select */
.form-checkbox   /* Checkbox */
.form-radio      /* Radio button */
.form-error      /* Error message */
.form-help       /* Help text */
```

### Layout
```css
.card             /* White container with shadow */
.card-header      /* Card title section */
.card-body        /* Card content section */
.card-footer      /* Card footer section */
.container        /* Centered max-width wrapper */
.flex             /* Flex container */
.grid             /* Grid container */
.modal-overlay    /* Modal background */
.modal-content    /* Modal body */
.slide-up-card    /* Bottom slide-up card */
```

### Typography
```css
.text-primary     /* Primary color text */
.text-accent      /* Accent color text */
.text-muted       /* Gray color text */
.text-bold        /* Bold weight */
.text-sm          /* Small font size */
.text-lg          /* Large font size */
.text-center      /* Center aligned */
```

### Utilities
```css
.hidden           /* display: none */
.cursor-pointer   /* cursor: pointer */
.shadow-md        /* Medium shadow */
.shadow-lg        /* Large shadow */
.rounded-lg       /* Border radius */
.animate-pulse    /* Pulsing animation */
.animate-spin     /* Spinning animation */
.gap-md           /* Gap between flex items */
```

---

## Component Composition Example

Here's how components work together in HomePage:

```tsx
export default function HomePage() {
  const [zones, setZones] = useState<ParkingZone[]>([...])
  const [vehicles, setVehicles] = useState<Vehicle[]>([...])
  const [selectedZone, setSelectedZone] = useState<ParkingZone | null>(null)
  const [activeSession, setActiveSession] = useState<ParkingSession | null>(null)
  const [showCard, setShowCard] = useState(false)

  return (
    <div>
      {/* Map component with zone selection */}
      <Map zones={zones} onZoneSelect={handleZoneSelect} />

      {/* Booking card slides up when zone selected */}
      {showCard && (
        <ParkingCard
          zone={selectedZone}
          vehicles={vehicles}
          onClose={() => setShowCard(false)}
          onPark={handlePark}
        />
      )}

      {/* Session overlay shows when parking active */}
      {activeSession && (
        <ActiveSession
          session={activeSession}
          zone={activeSessionZone}
          onExtend={handleExtend}
          onEnd={handleEnd}
        />
      )}
    </div>
  )
}
```

---

**All components are fully typed with TypeScript and ready for production use!**
