# Plan d'Intégration et Déploiement Docker

**Projet :** BankingOCR Frontend  
**Date :** 2026-03-02  
**Version :** 0.1.0

---

## 📋 Table des matières

1. [Prérequis](#1-prérequis)
2. [Architecture de déployment](#2-architecture-de-déploiement)
3. [Configuration Docker](#3-configuration-docker)
4. [Intégration Backend](#4-intégration-backend)
5. [Variables d'environnement](#5-variables-denvironnement)
6. [Commandes de déployment](#6-commandes-de-déploiement)
7. [Health checks et monitoring](#7-health-checks-et-monitoring)
8. [Dépannage](#8-dépannage)

---

## 1. Prérequis

### Système
- Docker Desktop (Windows) ou Docker Engine 20+
- Docker Compose 2.0+
- Node.js 20+ (pour développement local)
- 2GB RAM minimum pour les conteneurs

### Backend
- Backend Spring Boot disponible sur `http://localhost:8096` ou URL distante
- Endpoint `/api/health` opérationnel

---

## 2. Architecture de déploiement

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                          │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │   Frontend       │  ────▶  │   Backend Spring Boot    │  │
│  │   BankingOCR     │  :3000  │   (port 8096)            │  │
│  │   (Next.js)      │         │                          │  │
│  └──────────────────┘         └──────────────────────────┘  │
│           │                              │                   │
│           ▼                              ▼                   │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │   Nginx (option) │         │   Base de données        │  │
│  │   Reverse Proxy  │         │   (PostgreSQL/MySQL)     │  │
│  └──────────────────┘         └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Configuration Docker

### 3.1 Dockerfile (existant - à vérifier)

Le Dockerfile utilise un **build multi-stage** :

| Stage | Description |
|-------|-------------|
| `deps` | Installation des dépendances npm |
| `builder` | Build Next.js en standalone |
| `runner` | Image de production minimale |

**Points de vigilance :**
- ✅ Utilise `output: 'standalone'` (nécessite configuration next.config.mjs)
- ✅ Utilisateur non-root (`nextjs`) pour sécurité
- ✅ Healthcheck intégré sur `/api/health`

### 3.2 docker-compose.yml (configuration actuelle)

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        API_PROXY_TARGET: ${API_PROXY_TARGET:-http://host.docker.internal:8096}
    container_name: bankingocr-frontend
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      NEXT_TELEMETRY_DISABLED: "1"
      NEXT_PUBLIC_USE_MOCK: ${NEXT_PUBLIC_USE_MOCK:-false}
      NEXT_PUBLIC_API_URL: /api
      API_PROXY_TARGET: ${API_PROXY_TARGET:-http://host.docker.internal:8096}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Note:
- `NEXT_PUBLIC_API_URL` reste toujours `/api` pour forcer des appels same-origin depuis le navigateur.
- `API_PROXY_TARGET` pointe vers le backend réel:
  - Backend sur la machine hôte: `http://host.docker.internal:8096`
  - Backend dans un autre service Compose: `http://backend:8096`

---

## 4. Intégration Backend

### 4.1 Configuration du proxy API

Le fichier `next.config.mjs` doit être vérifié :

```javascript
const API_PROXY_TARGET = (process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8096').replace(/\/$/, '')
const HAS_ABSOLUTE_PROXY_TARGET = /^https?:\/\//.test(API_PROXY_TARGET)

const nextConfig = {
  output: 'standalone',  // ⚠️ Requis pour Docker
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!HAS_ABSOLUTE_PROXY_TARGET) return []
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
```

### 4.2 Points d'intégration critiques

| Endpoint | Statut | Action requise |
|----------|--------|----------------|
| `POST /api/auth/login` | ⚠️ Incompatible | Mapper réponse backend → frontend |
| `GET /api/dossiers` | ⚠️ Incompatible | Brancher sur API réelle |
| `POST /api/dynamic-invoices/upload` | ⚠️ Incompatible | Ajouter `dossierId` |
| `GET /api/health` | ❓ À vérifier | Créer endpoint si inexistant |

### 4.3 Résolution des incompatibilités

Avant déploiement, exécuter :

```bash
# 1. Désactiver le mode mock
# Modifier src/mock/data.mock.ts ou utiliser variable d'environnement
NEXT_PUBLIC_USE_MOCK=false

# 2. Vérifier alignement des statuts
# Frontend doit utiliser: VERIFY, READY_TO_TREAT, READY_TO_VALIDATE, VALIDATED, REJECTED

# 3. Tester connexion backend
curl http://localhost:8096/api/health
```

---

## 5. Variables d'environnement

### 5.1 Fichier `.env` (production)

```bash
# API Backend
API_PROXY_TARGET=http://host.docker.internal:8096
NEXT_PUBLIC_USE_MOCK=false

# Configuration Next.js
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Optionnel - Analytics
NEXT_PUBLIC_ANALYTICS_ID=your-id
```

### 5.2 Fichier `.env.local` (développement)

```bash
NEXT_PUBLIC_API_URL=/api
API_PROXY_TARGET=http://localhost:8096
NEXT_PUBLIC_USE_MOCK=false
```

---

## 6. Commandes de déploiement

### 6.1 Développement local

```bash
# 1. Démarrer le backend (si Docker)
docker-compose up -d backend

# 2. Démarrer le frontend
npm run dev
# ou
docker-compose up -d frontend
```

### 6.2 Build et déploiement complet

```bash
# 1. Nettoyer les anciens conteneurs
docker-compose down --volumes --remove-orphans

# 2. Reconstruire les images
docker-compose build --no-cache

# 3. Démarrer tous les services
docker-compose up -d

# 4. Vérifier les logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

### 6.3 Commandes utiles

```bash
# Voir l'état des services
docker-compose ps

# Redémarrer un service
docker-compose restart frontend

# Accéder au shell du conteneur
docker exec -it bankingocr-frontend sh

# Voir les logs en temps réel
docker-compose logs -f

# Arrêter tous les services
docker-compose down

# Nettoyer complètement (volumes inclus)
docker-compose down --volumes --rmi all
```

---

## 7. Health checks et monitoring

### 7.1 Endpoints de santé

| Service | Endpoint | Port |
|---------|----------|------|
| Frontend | `/api/health` | 3000 (interne) / 3000 (externe) |
| Backend | `/api/health` | 8096 |

### 7.2 Vérification manuelle

```bash
# Tester le frontend
curl http://localhost:3000/api/health

# Tester le backend
curl http://localhost:8096/api/health

# Tester la chaîne complète
curl http://localhost:3000/api/dossiers
```

### 7.3 Monitoring Docker

```bash
# Utilisation ressources
docker stats bankingocr-frontend bankingocr-backend

# Inspecter le conteneur
docker inspect bankingocr-frontend

# Vérifier réseau
docker network inspect bankingocr-network
```

---

## 8. Dépannage

### Problème : Frontend ne démarre pas

```bash
# Vérifier les logs
docker-compose logs frontend

# Causes possibles :
# - Build échoué (vérifier next.config.mjs)
# - Port déjà utilisé (changer port dans docker-compose)
# - Dépendances manquantes (rebuilt avec --no-cache)
```

### Problème : Connexion backend échoue

```bash
# 1. Vérifier que backend est healthy
docker-compose ps backend

# 2. Tester depuis le conteneur frontend
docker exec bankingocr-frontend wget -qO- http://backend:8096/api/health

# 3. Vérifier réseau Docker
docker network ls
docker network inspect bankingocr-network
```

### Problème : CORS errors

Avec cette architecture, le navigateur appelle `http://localhost:3000/api/...` (same-origin), puis Next.js proxy vers le backend via `API_PROXY_TARGET`.

Checklist rapide:
- `NEXT_PUBLIC_API_URL=/api`
- `API_PROXY_TARGET` valide et accessible depuis le conteneur frontend
- Rebuild obligatoire après changement de variables de build:
  - `docker-compose build --no-cache frontend`

Ajouter CORS dans Spring Boot uniquement si vous faites des appels frontend directs vers `http://localhost:8096` :

```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:3000")
                        .allowedMethods("*");
            }
        };
    }
}
```

### Problème : Mock toujours actif

```bash
# 1. Vérifier variable d'environnement
docker exec bankingocr-frontend env | grep MOCK

# 2. Forcer dans docker-compose.yml
environment:
  - NEXT_PUBLIC_USE_MOCK=false

# 3. Rebuild l'image
docker-compose build frontend
```

---

## 📎 Checklist pré-déploiement

- [ ] Backend Spring Boot opérationnel et accessible
- [ ] Endpoint `/api/health` disponible
- [ ] Variables d'environnement configurées
- [ ] Mode mock désactivé (`NEXT_PUBLIC_USE_MOCK=false`)
- [ ] Next.js configuré avec `output: 'standalone'`
- [ ] Ports non conflictuels (3000, 8096)
- [ ] Health checks fonctionnels
- [ ] Logs accessibles et monitorés

---

## 🚀 Déploiement rapide (résumé)

```bash
# 1. Configurer .env
cp .env.docker.example .env
# Éditer .env avec les bonnes valeurs

# 2. Build et démarrage
docker-compose build
docker-compose up -d

# 3. Vérification
docker-compose ps
curl http://localhost:3000/api/health

# 4. Logs
docker-compose logs -f
```

---

**Document créé pour :** BankingOCR Frontend  
**Mainteneur :** Équipe de développement  
**Dernière mise à jour :** 2026-03-02
