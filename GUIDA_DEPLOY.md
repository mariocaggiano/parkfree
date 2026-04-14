# ParkFree — Guida al Deploy Completo

> Questa guida ti porta da zero a produzione in circa 60–90 minuti.  
> Non è richiesta esperienza con i server: segui i passaggi nell'ordine indicato.

---

## Panoramica dell'architettura

```
Utente (browser / smartphone)
        │
        ▼
┌───────────────────┐     ┌──────────────────────┐
│  Vercel (CDN)     │     │  Railway (backend)   │
│                   │     │                      │
│  • App React      │────▶│  Node.js / Express   │
│  • Landing page   │ API │  TypeScript          │
│  • Admin panel    │     │  Port 3001           │
│  • Enforcement    │     └──────────┬───────────┘
└───────────────────┘                │
                                     ▼
                          ┌──────────────────────┐
                          │  Supabase (DB)       │
                          │  PostgreSQL + PostGIS │
                          └──────────────────────┘

Servizi esterni:
  • Firebase  → autenticazione utenti
  • Stripe    → pagamenti con carta
  • Mapbox    → mappa interattiva
```

---

## FASE 1 — Preparazione dei servizi esterni

### 1.1 Firebase (Autenticazione)

1. Vai su [console.firebase.google.com](https://console.firebase.google.com) e fai login con il tuo account Google.
2. Clicca **Aggiungi progetto** → chiama il progetto `parkfree` → disabilita Google Analytics se vuoi → **Crea progetto**.
3. Nel menu laterale, vai su **Authentication** → **Inizia** → **Metodo di accesso**.
4. Abilita: **E-mail/Password**, **Google**, e (opzionale) **Telefono**.
5. Vai su **Impostazioni progetto** (icona ⚙️ in alto a sinistra) → scheda **Le tue app** → clicca l'icona `</>` (Web).
6. Registra l'app con il nome `parkfree-web` → ti verrà mostrato un blocco `firebaseConfig`: **copia questi valori**, ti serviranno per il frontend.
7. Torna su **Impostazioni progetto** → scheda **Account di servizio** → clicca **Genera nuova chiave privata** → scarica il file `.json`. Questo è il Service Account per il backend. **Tienilo al sicuro, non caricarlo mai su GitHub**.

### 1.2 Stripe (Pagamenti)

1. Vai su [dashboard.stripe.com](https://dashboard.stripe.com) e crea un account (o accedi).
2. Nella home del dashboard, nella sezione **Sviluppatori → Chiavi API**, copia:
   - `Publishable key` (inizia con `pk_live_...`) → serve al frontend
   - `Secret key` (inizia con `sk_live_...`) → serve al backend
3. Vai su **Sviluppatori → Webhook** → **Aggiungi endpoint**:
   - URL endpoint: `https://TUO-BACKEND.up.railway.app/api/payments/webhook`
   - Events: seleziona `payment_intent.succeeded`, `payment_intent.payment_failed`, `setup_intent.succeeded`
   - Dopo la creazione, copia il **Signing secret** (`whsec_...`) → serve al backend

> **Modalità test vs. live**: durante i test usa le chiavi `pk_test_` / `sk_test_`. Quando sei pronto per il lancio reale, sostituisci con le chiavi `pk_live_` / `sk_live_`.

### 1.3 Mapbox (Mappe)

1. Vai su [account.mapbox.com](https://account.mapbox.com) e crea un account gratuito.
2. Nella dashboard, clicca **Access tokens** → **Create a token**.
3. Dagli un nome (es. `parkfree-web`), lascia i permessi di default → **Create**.
4. Copia il token (inizia con `pk.eyJ1...`) → serve al frontend.

---

## FASE 2 — Database (Supabase)

1. Vai su [supabase.com](https://supabase.com) → **Start your project** → **New project**.
2. Scegli un'organizzazione (o creane una) → nome progetto: `parkfree` → imposta una **password del database sicura** (annotala!) → regione: `West EU (Ireland)` → **Create new project**.
3. Aspetta 1–2 minuti che il progetto venga provisioning.
4. Nel menu laterale, vai su **SQL Editor** → **New query**.
5. Apri il file `backend/src/models/schema.sql` dal repository, copia tutto il contenuto e incollalo nell'editor SQL → clicca **RUN**.
   - Dovresti vedere: `Success. No rows returned`.
   - Questo crea tutte le tabelle, gli indici e i dati seed (zone di Milano).
6. Ora recupera la **stringa di connessione**:
   - Menu laterale → **Settings** → **Database** → scorri fino a **Connection string** → seleziona **URI**.
   - Sostituisci `[YOUR-PASSWORD]` con la password che hai scelto al punto 2.
   - Avrà questa forma: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`
   - Aggiungi `?sslmode=require` alla fine.

---

## FASE 3 — Backend (Railway)

### 3.1 Deploy del backend

1. Vai su [railway.app](https://railway.app) → **Login with GitHub**.
2. Clicca **New Project** → **Deploy from GitHub repo**.
3. Connetti il tuo account GitHub (se non l'hai ancora fatto) e seleziona il repository `parkfree`.
4. Railway rileverà automaticamente la cartella `backend/`. Se chiede la root directory, imposta `backend`.
5. Vai su **Settings** → **Deploy** → verifica che:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. Vai su **Variables** e aggiungi le seguenti variabili (una per volta):

| Variabile | Valore |
|-----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | La stringa URI di Supabase (punto 2.6) |
| `FIREBASE_SERVICE_ACCOUNT` | Il contenuto del file `.json` scaricato da Firebase (tutto su una riga) |
| `STRIPE_SECRET_KEY` | La chiave segreta Stripe `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Il webhook signing secret `whsec_...` |
| `ENFORCEMENT_API_KEY` | Un token casuale sicuro (vedi nota sotto) |
| `FRONTEND_URL` | Lo lasci vuoto per ora, lo aggiorni dopo aver fatto il deploy del frontend |
| `APP_URL` | Lo lasci vuoto per ora, lo aggiorni con l'URL Railway dopo il primo deploy |

> **Come generare ENFORCEMENT_API_KEY**: apri il Terminale e digita `openssl rand -hex 32` (Mac/Linux) oppure usa [randomkeygen.com](https://randomkeygen.com/) e scegli una chiave di 256 bit.

> **Come mettere il JSON Firebase su una riga**: su Mac apri Terminale e digita `cat /percorso/al/file.json | tr -d '\n'`. In alternativa, apri il file con un editor di testo, seleziona tutto e usa "trova e sostituisci" per rimuovere le interruzioni di riga.

7. Clicca **Deploy** (o Railway partirà automaticamente).
8. Una volta completato il deploy, vai su **Settings** → **Domains** → **Generate Domain**. Copia l'URL (es. `https://parkfree-backend-production.up.railway.app`).
9. Torna su **Variables** e aggiorna `APP_URL` con questo URL.

### 3.2 Verifica del backend

Apri il browser e vai su `https://TUO-BACKEND.up.railway.app/health`. Dovresti vedere:
```json
{ "status": "ok", "timestamp": "2024-..." }
```

Se vedi questo, il backend funziona.

---

## FASE 4 — Frontend (Vercel)

### 4.1 Configurazione variabili d'ambiente

Prima del deploy, crea il file `frontend/.env.production.local` con i valori reali:

```env
VITE_API_URL=https://TUO-BACKEND.up.railway.app/api
VITE_MAPBOX_TOKEN=pk.eyJ1...    # dal punto 1.3
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=parkfree-XXXXX.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=parkfree-XXXXX
VITE_FIREBASE_STORAGE_BUCKET=parkfree-XXXXX.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:XXXX
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

> Puoi usare il file `frontend/.env.production` come riferimento (è già nel repository come template).

### 4.2 Deploy su Vercel

1. Vai su [vercel.com](https://vercel.com) → **Login with GitHub**.
2. Clicca **Add New Project** → importa il repository `parkfree`.
3. In **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Espandi **Environment Variables** e aggiungi tutte le variabili del file `.env.production.local` (una per volta, oppure incolla direttamente il contenuto del file nella sezione "Import .env").
5. Clicca **Deploy**.
6. Al termine, copia l'URL del frontend (es. `https://parkfree.vercel.app`).

### 4.3 Aggiornare CORS nel backend

1. Torna su Railway → **Variables** del tuo backend.
2. Aggiorna `FRONTEND_URL` con l'URL Vercel: `https://parkfree.vercel.app`.
3. Railway farà automaticamente il redeploy.

### 4.4 Aggiungere dominio personalizzato (opzionale)

Se hai un dominio (es. `www.parkfree.it`):

**Su Vercel**: Settings → Domains → aggiungi il tuo dominio → segui le istruzioni per configurare i DNS.

**Su Railway** (per il backend): Settings → Domains → Custom Domain → inserisci es. `api.parkfree.it`.

---

## FASE 5 — Deploy delle pagine statiche

Le pagine `landing/`, `admin/` e `enforcement/` sono file HTML statici autonomi (nessun build necessario). Puoi deployarle in tre modi:

### Opzione A — Su Vercel (stesso progetto, sottocartelle)

1. Nella dashboard Vercel del progetto `parkfree`, vai su **Settings** → **Git**.
2. Il file `vercel.json` nella radice del repository configura già le routes per servire le pagine statiche.

### Opzione B — Progetti Vercel separati (consigliato per isolamento)

Ripeti il processo di deploy (Fase 4) per ogni pagina, impostando come **Root Directory**:
- `landing` per la landing page
- `admin` per il pannello admin
- `enforcement` per l'app degli agenti

### 5.1 Configurare l'URL API nell'app enforcement

Apri `enforcement/index.html` e cerca la riga:
```javascript
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : '/api';
```
Se l'app enforcement è su un dominio diverso dal backend, sostituisci `/api` con l'URL completo del backend:
```javascript
const API_BASE = 'https://TUO-BACKEND.up.railway.app/api';
```

### 5.2 Impostare la chiave API enforcement

L'app enforcement deve includere l'header `X-Enforcement-Key` in tutte le richieste. Apri `enforcement/index.html`, cerca la funzione `checkPlate` e aggiungi:
```javascript
headers: {
  'Content-Type': 'application/json',
  'X-Enforcement-Key': 'IL_TUO_ENFORCEMENT_API_KEY'
}
```

> Per sicurezza, considera di non mettere la chiave direttamente nell'HTML pubblico ma di richiedere il login agli agenti tramite Firebase Authentication.

---

## FASE 6 — Verifica finale

Dopo tutti i deploy, testa i seguenti flussi:

### Flusso utente (App React)
- [ ] Registrazione con email → email di verifica arriva
- [ ] Login con Google funziona
- [ ] Aggiungi veicolo (targa)
- [ ] Aggiungi carta di credito (usa la carta test Stripe: `4242 4242 4242 4242`, qualsiasi data futura, qualsiasi CVC)
- [ ] Visualizza mappa con le zone di Milano
- [ ] Avvia una sessione di parcheggio
- [ ] Il timer scorre e il costo si aggiorna
- [ ] Termina la sessione
- [ ] Visualizza la cronologia

### Flusso enforcement
- [ ] Apri l'app enforcement
- [ ] Inserisci una targa attiva → vedi verde con countdown
- [ ] Inserisci una targa non registrata → vedi rosso

### Flusso admin
- [ ] Apri il pannello admin
- [ ] I grafici si caricano (note: i dati sono mock — per dati reali collegare le API)

---

## Risoluzione problemi comuni

**Errore CORS** (`Access-Control-Allow-Origin`)
→ Verifica che `FRONTEND_URL` in Railway corrisponda esattamente all'URL Vercel (senza slash finale).

**Firebase error: `auth/unauthorized-domain`**
→ Nella console Firebase → Authentication → Impostazioni → Domini autorizzati, aggiungi il dominio Vercel.

**Stripe webhook non riceve eventi**
→ Verifica che l'URL del webhook nel dashboard Stripe sia `https://TUO-BACKEND.railway.app/api/payments/webhook` (non `/webhooks`).

**Database connection refused**
→ In Supabase → Settings → Database → Network: assicurati di non avere restrizioni IP (o aggiungi gli IP Railway alla whitelist).

**Build Vercel fallisce**
→ Controlla che tutte le variabili d'ambiente siano impostate. Un valore `VITE_*` mancante non causa errori a build time ma rompe l'app a runtime.

**Mappa non si carica**
→ In Mapbox → Access tokens, verifica che il token non abbia restrizioni di dominio, oppure aggiungi il dominio Vercel alla whitelist del token.

---

## Costi stimati

| Servizio | Piano gratuito | Quando paghi |
|----------|---------------|-------------|
| Vercel | 100 GB/mese di banda | Con molto traffico |
| Railway | $5 crediti/mese inclusi | Oltre ~500h/mese di CPU |
| Supabase | 500 MB DB, 2 GB banda | Oltre questi limiti |
| Firebase Auth | 10.000 utenti/mese gratis | Oltre 10.000 utenti |
| Stripe | 1,5% + 0,25€ per transazione | Ogni pagamento riuscito |
| Mapbox | 50.000 map loads/mese gratis | Oltre 50.000 visualizzazioni |

**Costo stimato per i primi mesi (fino a ~1.000 utenti attivi): €0–€10/mese**.

---

*Guida creata per ParkFree — versione 1.0*
