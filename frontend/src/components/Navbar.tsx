import { Link, useLocation } from 'react-router-dom'
import { MapPin, Car, Wallet, Gift, User } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',        icon: MapPin,  label: 'Mappa'  },
  { to: '/vehicles',icon: Car,     label: 'Auto'   },
  { to: '/wallet',  icon: Wallet,  label: 'Saldo'  },
  { to: '/referral',icon: Gift,    label: 'Invita' },
  { to: '/profile', icon: User,    label: 'Profilo'},
]

export default function Navbar() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`navbar-item ${isActive(to) ? 'active' : ''}`}
          >
            <Icon size={24} />
            <span className="navbar-label">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
