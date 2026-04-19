import { getApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { Vehicle, ParkingSession, WalletTransaction } from '../types'

const db = getFirestore(getApp())

function currentUid(): string {
  const uid = getAuth().currentUser?.uid
  if (!uid) throw new Error('Utente non autenticato')
  return uid
}

// ─── VEICOLI ────────────────────────────────────────────────

export const vehiclesService = {
  async getAll(): Promise<Vehicle[]> {
    const uid = currentUid()
    const q = query(
      collection(db, 'vehicles'),
      where('userId', '==', uid),
      orderBy('createdAt', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle))
  },

  async add(
    data: Omit<Vehicle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Vehicle> {
    const uid = currentUid()
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'vehicles'), {
      ...data,
      userId: uid,
      createdAt: now,
      updatedAt: now,
    })
    return { id: docRef.id, userId: uid, ...data, createdAt: now, updatedAt: now }
  },

  async update(
    id: string,
    data: Partial<Pick<Vehicle, 'licensePlate' | 'alias' | 'defaultBadge' | 'color'>>
  ): Promise<void> {
    await updateDoc(doc(db, 'vehicles', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'vehicles', id))
  },
}

// ─── SESSIONI PARCHEGGIO ────────────────────────────────────

export const sessionsService = {
  async create(data: Omit<ParkingSession, 'id' | 'userId'>): Promise<ParkingSession> {
    const uid = currentUid()
    const docRef = await addDoc(collection(db, 'sessions'), { ...data, userId: uid })
    return { id: docRef.id, userId: uid, ...data }
  },

  async getActive(): Promise<ParkingSession | null> {
    const uid = currentUid()
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', uid),
      where('status', '==', 'active'),
      limit(1)
    )
    const snap = await getDocs(q)
    if (snap.empty) return null
    const d = snap.docs[0]
    return { id: d.id, ...d.data() } as ParkingSession
  },

  async getCompleted(limitN = 50): Promise<ParkingSession[]> {
    const uid = currentUid()
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', uid),
      where('status', '==', 'completed'),
      orderBy('startTime', 'desc'),
      limit(limitN)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ParkingSession))
  },

  async update(id: string, data: Partial<ParkingSession>): Promise<void> {
    await updateDoc(doc(db, 'sessions', id), data)
  },

  async end(id: string, endTime: string, cost: number): Promise<void> {
    await updateDoc(doc(db, 'sessions', id), {
      status: 'completed',
      endTime,
      cost,
    })
  },

  onActiveSession(
    uid: string,
    callback: (session: ParkingSession | null) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', uid),
      where('status', '==', 'active'),
      limit(1)
    )
    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        callback(null)
      } else {
        const d = snap.docs[0]
        callback({ id: d.id, ...d.data() } as ParkingSession)
      }
    })
  },
}

// ─── PROFILO UTENTE ─────────────────────────────────────────

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  phoneNumber?: string
  city?: string
  referralCode: string
  referredBy?: string
  createdAt: string
  updatedAt: string
}

function generateReferralCode(uid: string): string {
  return 'PF' + uid.substring(0, 6).toUpperCase()
}

export const profileService = {
  async get(): Promise<UserProfile | null> {
    const uid = currentUid()
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    return { uid, ...snap.data() } as UserProfile
  },

  async createOrUpdate(data: Partial<Omit<UserProfile, 'uid'>>): Promise<void> {
    const uid = currentUid()
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() })
    } else {
      const referralCode = generateReferralCode(uid)
      await setDoc(ref, {
        ...data,
        uid,
        referralCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  },
}

// ─── WALLET ─────────────────────────────────────────────────

export const walletService = {
  async getBalance(): Promise<number> {
    const uid = currentUid()
    const snap = await getDoc(doc(db, 'wallets', uid))
    if (!snap.exists()) return 0
    return snap.data().balance ?? 0
  },

  async getTransactions(limitN = 20): Promise<WalletTransaction[]> {
    const uid = currentUid()
    const q = query(
      collection(db, 'wallets', uid, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(limitN)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WalletTransaction))
  },

  async addTransaction(tx: Omit<WalletTransaction, 'id' | 'balanceAfter'>): Promise<void> {
    const uid = currentUid()
    const walletRef = doc(db, 'wallets', uid)
    const walletSnap = await getDoc(walletRef)
    const currentBalance = walletSnap.exists() ? (walletSnap.data().balance ?? 0) : 0
    const newBalance = Math.round((currentBalance + tx.amount) * 100) / 100
    await setDoc(walletRef, { balance: newBalance, updatedAt: new Date().toISOString() }, { merge: true })
    await addDoc(collection(db, 'wallets', uid, 'transactions'), {
      ...tx,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    })
  },
}

// ─── REFERRAL ────────────────────────────────────────────────

export interface ReferralInfo {
  code: string
  referredUsers: number
  totalEarned: number
}

export const referralService = {
  async getInfo(): Promise<ReferralInfo> {
    const uid = currentUid()
    const profile = await profileService.get()
    const code = profile?.referralCode ?? generateReferralCode(uid)
    const snap = await getDoc(doc(db, 'referrals', uid))
    if (!snap.exists()) return { code, referredUsers: 0, totalEarned: 0 }
    const data = snap.data()
    return {
      code,
      referredUsers: data.referredUsers ?? 0,
      totalEarned: data.totalEarned ?? 0,
    }
  },

  async applyCode(code: string): Promise<{ success: boolean; message: string }> {
    const uid = currentUid()
    const q = query(collection(db, 'users'), where('referralCode', '==', code.toUpperCase()))
    const snap = await getDocs(q)
    if (snap.empty) return { success: false, message: 'Codice non valido' }
    const referrerDoc = snap.docs[0]
    if (referrerDoc.id === uid) return { success: false, message: 'Non puoi usare il tuo codice' }

    const profile = await profileService.get()
    if (profile?.referredBy) return { success: false, message: 'Codice gia utilizzato' }

    await profileService.createOrUpdate({ referredBy: referrerDoc.id })

    const referrerUid = referrerDoc.id
    const referrerWalletRef = doc(db, 'wallets', referrerUid)
    const referrerWalletSnap = await getDoc(referrerWalletRef)
    const referrerBalance = referrerWalletSnap.exists() ? (referrerWalletSnap.data().balance ?? 0) : 0
    const newReferrerBalance = Math.round((referrerBalance + 2.0) * 100) / 100
    await setDoc(referrerWalletRef, { balance: newReferrerBalance, updatedAt: new Date().toISOString() }, { merge: true })
    await addDoc(collection(db, 'wallets', referrerUid, 'transactions'), {
      type: 'referral_credit',
      amount: 2.0,
      balanceAfter: newReferrerBalance,
      description: 'Bonus referral - nuovo utente registrato',
      createdAt: new Date().toISOString(),
    })

    const referralRef = doc(db, 'referrals', referrerUid)
    const referralSnap = await getDoc(referralRef)
    const referralData = referralSnap.exists() ? referralSnap.data() : { referredUsers: 0, totalEarned: 0 }
    await setDoc(
      referralRef,
      {
        referredUsers: (referralData.referredUsers ?? 0) + 1,
        totalEarned: Math.round(((referralData.totalEarned ?? 0) + 2.0) * 100) / 100,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    await walletService.addTransaction({
      type: 'referral_credit',
      amount: 1.0,
      description: 'Bonus benvenuto - codice referral applicato',
      createdAt: new Date().toISOString(),
    })

    return { success: true, message: 'Codice applicato! Hai ricevuto 1.00 di credito.' }
  },
}
