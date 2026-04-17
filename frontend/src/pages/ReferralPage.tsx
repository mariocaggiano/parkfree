import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Users, Euro, Share2 } from 'lucide-react'
import { parkingAPI } from '../services/api'


interface ReferralStats {
  code: string
  invitesSent: number
  invitesAccepted: number
  creditsEarned: number
  creditsAvailable: number
  referralHistory: ReferralEntry[]
}


interface ReferralEntry {
  id: string
  inviteeName: string
  acceptedAt: string
  creditEarned: number
  status: 'pending' | 'completed'
}


// Dati demo
const DEMO_STATS: ReferralStats = {
  code: 'PARK-MARIO7',
  invitesSent: 5,
  invitesAccepted: 3,
  creditsEarned: 3.0,
  creditsAvailable: 1.5,
  referralHistory: [
    { id: 'r1', inviteeName: 'Luca B.', acceptedAt: new Date(Date.now() - 7 * 86400000).toISOString(), creditEarned: 1.0, status: 'completed' },
    { id: 'r2', inviteeName: 'Sara M.', acceptedAt: new Date(Date.now() - 14 * 86400000).toISOString(), creditEarned: 1.0, status: 'completed' },
    { id: 'r3', inviteeName: 'Marco R.', acceptedAt: new Date(Date.now() - 2 * 86400000).toISOString(), creditEarned: 1.0, status: 'completed' },
    { id: 'r4', inviteeName: 'Anna T.', acceptedAt: new Date().toISOString(), creditEarned: 1.0, status: 'pending' },
    { id: 'r5', inviteeName: 'Giorgio F.', acceptedAt: new Date().toISOString(), creditEarned: 1.0, status: 'pending' },
  ],
}


export default function ReferralPage() {
  const [stats, setStats] = useState<ReferralStats>(DEMO_STATS)
  const [copied, setCopied] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)


  useEffect(() => {
    const fetchReferral = async () => {
      try {
        const res = await parkingAPI.getReferralStats()
        if (res.data) setStats(res.data)
      } catch {
        // Usa dati demo
      }
    }
    fetchReferral()
  }, [])


  const referralLink = `https://parkfree.it/invito/${stats.code}`


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }


  const handleShare = async () => {
    setShareLoading(true)
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ParkFree — Parcheggia in un tap',
          text: `Prova ParkFree per pagare le strisce blu! Usiamo il mio codice e otteniamo entrambi 1€ di credito: ${stats.code}`,
