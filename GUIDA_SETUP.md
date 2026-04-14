# ParkFree - Guida Setup Completa

## Panoramica

ParkFree e' composta da:
- **Backend**: Node.js + Express + TypeScript (porta 3001)
- **Frontend**: React + TypeScript + Vite (porta 5173)
- **Database**: PostgreSQL 15 + PostGIS
- **Servizi esterni**: Firebase (auth), Stripe (pagamenti), Mapbox (mappe)

---

## Prerequisiti

- **Node.js 18+**: [nodejs.org](https://nodejs.org)
- **Docker Desktop** (consigliato per PostgreSQL): [docker.com](https://www.docker.com/products/docker-desktop/)
- Un browser moderno (Chrome, Firefox, Safari)

---

## Setup Rapido (1 comando)

```bash
cd ParkFree_App
chmod +x setup.sh
./setup.sh
```

Lo script installa le dipendenze, crea il database PostgreSQL (con Docker) e carica lo schema con i dati di Milano.

---

## Configurazione Servizi Esterni

### 1. Firebase (Autenticazione) - GRATUITO

Firebase gestisce login, registrazione e verifica telefono.

**Passo 1: Crea il progetto**
1. Vai su [console.firebase.google.com](https://console.firebase.google.com)
2. Clicca "Aggiungi progetto"
3. Nome: `parkfree` (o quello che preferisci)
4. Disattiva Google Analytics (non serve per ora)
5. Clicca "Crea progetto"

**Passo 2: Attiva Authentication**
1. Nel menu laterale, clicca "Authentication"
2. Clicca "Inizia"
3. Nella tab "Sign-in method", attiva:
   - Email/Password
   - Google
   - Apple (opzionale, richiede account Apple Developer)
   - Phone (per OTP via SMS)

**Passo 3: Aggiungi app web**
1. Nella home del progetto, clicca l'icona `</>`  (Web)
2. Nome app: `parkfree-web`
3. Clicca "Registra app"
4. Copia i valori della configurazione Firebase

**Passo 4: Configura il frontend**

Apri `frontend/.env` e inserisci i valori copiati:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=parkfree-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=parkfree-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=parkfree-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Passo 5: Configura il backend**
1. In Firebase Console, vai su Impostazioni Progetto (icona ingranaggio)
2. Tab "Account di servizio"
3. Clicca "Genera nuova chiave privata"
4. Salva il file JSON come `backend/firebase-service-account.json`

---

### 2. Stripe (Pagamenti) - GRATUITO in modalita' test

Stripe gestisce carte di credito, PayPal, Apple Pay e Google Pay.

**Passo 1: Crea account**
1. Vai su [dashboard.stripe.com](https://dashboard.stripe.com)
2. Registrati con la tua email
3. NON serve attivare l'account per usare la modalita' test

**Passo 2: Ottieni le chiavi API**
1. Assicurati di essere in modalita' "Test" (toggle in alto a destra)
2. Vai su "Developers" > "API keys"
3. Copia:
   - **Publishable key**: inizia con `pk_test_...`
   - **Secret key**: inizia con `sk_test_...`

**Passo 3: Configura**

In `backend/.env`:
```
STRIPE_SECRET_KEY=sk_test_...la_tua_chiave...
```

In `frontend/.env`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...la_tua_chiave...
```

**Carte di test Stripe:**
- Successo: `4242 4242 4242 4242` (qualsiasi data futura, qualsiasi CVV)
- Rifiutata: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

---

### 3. Mapbox (Mappe) - GRATUITO fino a 50.000 caricamenti/mese

**Passo 1: Crea account**
1. Vai su [account.mapbox.com](https://account.mapbox.com)
2. Registrati gratuitamente

**Passo 2: Ottieni il token**
1. Nella dashboard, trova "Default public token"
2. Copia il token (inizia con `pk.eyJ1...`)

**Passo 3: Configura**

In `frontend/.env`:
```
VITE_MAPBOX_TOKEN=pk.eyJ1...il_tuo_token...
```

---

## Avvio dell'Applicazione

### Avvia il database (se usi Docker)
```bash
docker start parkfree-db
```

### Avvia il backend
```bash
cd backend
npm run dev
```
Il server parte su http://localhost:3001

### Avvia il frontend (in un altro terminale)
```bash
cd frontend
npm run dev
```
L'app si apre su http://localhost:5173

---

## Struttura del Progetto

```
ParkFree_App/
├── setup.sh                 # Script di setup automatico
├── GUIDA_SETUP.md           # Questa guida
├── backend/
│   ├── .env                 # Configurazione backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts         # Entry point server
│       ├── config/          # Database, Firebase, Stripe
│       ├── middleware/       # Auth middleware
│       ├── models/          # Schema SQL + seed data
│       ├── routes/          # API endpoints
│       └── services/        # Business logic
└── frontend/
    ├── .env                 # Configurazione frontend
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx         # Entry point React
        ├── App.tsx          # Routes
        ├── components/      # Componenti UI riutilizzabili
        ├── pages/           # Pagine dell'app
        ├── hooks/           # Custom React hooks
        ├── services/        # API client, Firebase auth
        ├── types/           # TypeScript interfaces
        ├── utils/           # Utility functions
        └── styles/          # CSS globale
```

---

## API Endpoints Principali

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | /api/auth/register | Registra nuovo utente |
| POST | /api/auth/social | Login con Google/Apple |
| GET | /api/zones?lat=X&lng=Y | Zone parcheggio vicine |
| POST | /api/sessions | Avvia sosta |
| PUT | /api/sessions/:id/stop | Termina sosta |
| GET | /api/sessions | Storico soste |
| GET | /api/analytics/spending | Dashboard spesa |

---

## Risoluzione Problemi

**"Cannot connect to database"**
- Verifica che Docker sia avviato: `docker ps`
- Verifica il container: `docker start parkfree-db`
- Controlla DATABASE_URL in `backend/.env`

**"Firebase: No Firebase App"**
- Verifica che le chiavi in `frontend/.env` siano corrette
- Riavvia il frontend dopo aver modificato `.env`

**"Map not loading"**
- Verifica il token Mapbox in `frontend/.env`
- Controlla la console del browser per errori

**Porta gia' in uso**
- Backend: cambia PORT in `backend/.env`
- Frontend: `npm run dev -- --port 3000`
