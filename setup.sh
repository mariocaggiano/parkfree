#!/bin/bash
# ============================================
# ParkFree - Script di Setup Automatico
# ============================================
# Questo script configura tutto il necessario per avviare ParkFree
# Requisiti: Node.js 18+, npm, Docker (opzionale per PostgreSQL)
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "  ____            _    _____               "
echo " |  _ \ __ _ _ __| | _|  ___| __ ___  ___  "
echo " | |_) / _\` | '__| |/ / |_ | '__/ _ \/ _ \ "
echo " |  __/ (_| | |  |   <|  _|| | |  __/  __/ "
echo " |_|   \__,_|_|  |_|\_\_|  |_|  \___|\___| "
echo ""
echo -e "${NC}"
echo -e "${GREEN}Setup automatico ParkFree - App Parcheggio Strisce Blu${NC}"
echo "=================================================="
echo ""

# Check prerequisites
echo -e "${BLUE}[1/6] Verifico i prerequisiti...${NC}"

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $1 trovato: $($1 --version 2>/dev/null | head -1)"
    else
        echo -e "  ${RED}✗${NC} $1 non trovato!"
        return 1
    fi
}

check_command node || { echo -e "${RED}Installa Node.js 18+ da https://nodejs.org${NC}"; exit 1; }
check_command npm || { echo -e "${RED}npm non trovato. Installa Node.js.${NC}"; exit 1; }

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ richiesto. Versione attuale: $(node -v)${NC}"
    exit 1
fi

if command -v docker &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Docker trovato (opzionale, per PostgreSQL)"
    HAS_DOCKER=true
else
    echo -e "  ${YELLOW}!${NC} Docker non trovato (PostgreSQL va installato manualmente)"
    HAS_DOCKER=false
fi

echo ""

# Install backend dependencies
echo -e "${BLUE}[2/6] Installo dipendenze backend...${NC}"
cd backend
npm install
echo -e "  ${GREEN}✓${NC} Dipendenze backend installate"
cd ..
echo ""

# Install frontend dependencies
echo -e "${BLUE}[3/6] Installo dipendenze frontend...${NC}"
cd frontend
npm install
echo -e "  ${GREEN}✓${NC} Dipendenze frontend installate"
cd ..
echo ""

# Setup database
echo -e "${BLUE}[4/6] Configuro il database...${NC}"

if [ "$HAS_DOCKER" = true ]; then
    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q '^parkfree-db$'; then
        echo -e "  ${YELLOW}!${NC} Container parkfree-db esiste gia'"
        docker start parkfree-db 2>/dev/null || true
    else
        echo "  Creo container PostgreSQL con PostGIS..."
        docker run -d \
            --name parkfree-db \
            -p 5432:5432 \
            -e POSTGRES_PASSWORD=parkfree \
            -e POSTGRES_DB=parkfree \
            -e POSTGRES_USER=postgres \
            postgis/postgis:15-3.3
        echo "  Attendo che PostgreSQL sia pronto..."
        sleep 5
    fi

    # Wait for PostgreSQL to be ready
    for i in {1..30}; do
        if docker exec parkfree-db pg_isready -U postgres &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} PostgreSQL pronto"
            break
        fi
        sleep 1
    done

    # Run schema
    echo "  Eseguo lo schema del database..."
    docker exec -i parkfree-db psql -U postgres -d parkfree < backend/src/models/schema.sql
    echo -e "  ${GREEN}✓${NC} Schema e dati seed caricati"
else
    echo -e "  ${YELLOW}!${NC} Docker non disponibile."
    echo "  Per configurare PostgreSQL manualmente:"
    echo "    1. Installa PostgreSQL 15+ con PostGIS"
    echo "    2. Crea il database: createdb parkfree"
    echo "    3. Esegui lo schema: psql -d parkfree -f backend/src/models/schema.sql"
fi

echo ""

# Check environment files
echo -e "${BLUE}[5/6] Verifico file di configurazione...${NC}"

if [ -f "backend/.env" ]; then
    echo -e "  ${GREEN}✓${NC} backend/.env presente"
else
    echo -e "  ${YELLOW}!${NC} backend/.env mancante - lo creo dal template"
    cp backend/.env.example backend/.env 2>/dev/null || echo "  Template non trovato"
fi

if [ -f "frontend/.env" ]; then
    echo -e "  ${GREEN}✓${NC} frontend/.env presente"
else
    echo -e "  ${YELLOW}!${NC} frontend/.env mancante"
fi

echo ""

# Summary
echo -e "${BLUE}[6/6] Riepilogo${NC}"
echo "=================================================="
echo ""
echo -e "${GREEN}Setup completato!${NC}"
echo ""
echo "Per avviare l'app:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "L'app sara' disponibile su:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo ""

# Check if API keys are configured
echo -e "${YELLOW}IMPORTANTE - Configura le chiavi API:${NC}"
echo ""
echo "  1. FIREBASE (per login utenti):"
echo "     > Vai su https://console.firebase.google.com"
echo "     > Crea progetto > Aggiungi app web > Copia config"
echo "     > Incolla in frontend/.env (VITE_FIREBASE_*)"
echo "     > Scarica chiave servizio > salva come backend/firebase-service-account.json"
echo ""
echo "  2. STRIPE (per pagamenti):"
echo "     > Vai su https://dashboard.stripe.com/test/apikeys"
echo "     > Copia Secret Key > incolla in backend/.env (STRIPE_SECRET_KEY)"
echo "     > Copia Publishable Key > incolla in frontend/.env (VITE_STRIPE_PUBLISHABLE_KEY)"
echo ""
echo "  3. MAPBOX (per la mappa):"
echo "     > Vai su https://account.mapbox.com/access-tokens/"
echo "     > Copia il Default Token > incolla in frontend/.env (VITE_MAPBOX_TOKEN)"
echo ""
echo -e "${GREEN}Leggi GUIDA_SETUP.md per istruzioni dettagliate passo-passo!${NC}"
echo ""
