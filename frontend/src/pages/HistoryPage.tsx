import { useState, useEffect } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import { ParkingSession } from '../types'
import { formatCurrency, formatDuration, formatDateTime } from '../utils/formatters'
import { parkingAPI } from '../services/api'


// Nomi zone demo (usati se API non disponibile)
const ZONE_NAMES: Record<string, string> = {
  z1: 'Duomo - Via Torino',
  z2: 'Brera - Via Solferino',
  z3: 'Navigli - Ripa di Porta Ticinese',
  z4: 'Porta Romana - Corso Lodi',
  z5: 'Stazione Centrale - Via Vittor Pisani',
}


export default function HistoryPage() {
  const [sessions, setSessions] = useState<ParkingSession[]>([
    {
      id: '1',
      userId: '',
      vehicleId: 'v1',
      zoneId: 'z1',
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      duration: 120,
      cost: 4.64,
      status: 'completed',
      paymentMethodId: 'pm1',
    },
    {
      id: '2',
      userId: '',
      vehicleId: 'v1',
      zoneId: 'z3',
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
