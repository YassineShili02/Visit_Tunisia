# Visit Tunisia 🧳

Application web complète de tourisme pour la Tunisie, containerisée avec Docker.

## Architecture

Le projet est composé de **4 services** orchestrés par `docker-compose.yml` :

| Service | Technologie | Port | Rôle |
|---------|-------------|------|------|
| `frontend` | Angular 19 + Nginx | **4200** | Interface utilisateur (point d'entrée unique) |
| `backend` | Spring Boot 4.1 (Java 17) + Python scrapers | **8082** | API REST + scraping de destinations |
| `ai` | FastAPI + Gemini | **8000** | Chatbot IA / recommandations |
| `db` | PostgreSQL 16 + **PostGIS** | **5433** (hôte) | Base de données géolocalisée |

```
Navigateur
   │  http://localhost:4200
   ▼
 ┌────────────┐   /api/chat   ┌────────────┐
 │  frontend  │──────────────▶│     ai     │
 │  (Nginx)   │               │  (FastAPI) │
 └────────────┘               └────────────┘
   │  /api/*     routing Nginx
   ▼
 ┌────────────┐   JDBC/PostGIS  ┌────────────┐
 │  backend   │───────────────▶ │     db     │
 │ (Spring    │                 │ (PostgreSQL│
 │  Boot+py)  │                 │  +PostGIS) │
 └────────────┘                 └────────────┘
```

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (avec moteur WSL2 démarré)
- ~6 GB d'espace disque libre

## Démarrage

1. **Cloner le projet**
   ```bash
   git clone <votre-repo> && cd Visit-Tunisia
   ```

2. **Configurer les secrets** (copier le modèle)
   ```bash
   cp .env.example .env
   # puis éditer .env et renseigner les vraies valeurs
   ```
   Le fichier `.env` est **absolument requis** (exclu de git via `.gitignore`).

3. **Lancer l'application**
   ```bash
   docker compose up --build -d
   ```

4. **Ouvrir le navigateur** : http://localhost:4200

> ⏳ Le premier démarrage télécharge les images et compile le backend (~5-10 min). Les démarrages suivants sont quasi instantanés.

## Configuration — variables d'environnement

Toutes les valeurs sensibles sont externalisées dans `.env` (à la racine) :

| Variable | Description | Où elle est utilisée |
|----------|-------------|----------------------|
| `DB_PASSWORD` | Mot de passe PostgreSQL | db, backend |
| `JWT_SECRET` | Clé de signature des JWT (≥32 car.) | backend |
| `MAIL_USERNAME` | Adresse Gmail d'envoi (vérification email) | backend |
| `MAIL_PASSWORD` | Mot de passe d'application Gmail | backend |
| `WEATHER_API_KEY` | Clé OpenWeatherMap | backend |
| `GEMINI_API_KEY` | Clé Google Gemini (chatbot) | ai |

**Copier `.env.example` → `.env`** puis remplir. Ne jamais committer `.env`.

## Migration de données existantes

Si tu as une base locale PostgreSQL à importer :

```bash
# Depuis la machine source
pg_dump -h localhost -U postgres -d visit_tunisia --no-owner --no-privileges -f dump.sql

# Vers le conteneur (le conteneur doit être démarré et healthy)
Get-Content dump.sql | docker exec -i vt_db psql -U postgres -d visit_tunisia
```

## Commandes utiles

```bash
docker compose ps            # état des services
docker compose logs -f backend   # logs du backend
docker compose down          # arrêter (les données sont conservées dans les volumes)
docker compose down -v       # arrêter ET supprimer les données (attention)
docker compose up -d --build # reconstruire après un changement de code
```

## Données persistantes

- **`pgdata`** : base PostgreSQL (destinations, itinéraires, comptes...)
- **`uploads`** : photos téléchargées par les utilisateurs

Ces volumes survivent à `docker compose down` et ne sont détruits que par `down -v`.

## Structure du dépôt

```
Visit-Tunisia/
├── docker-compose.yml        # Orchestration des 4 services
├── .env.example              # Modèle de configuration (→ copier vers .env)
├── Visit_Tunisia_Backend/    # Spring Boot + Python scrapers (Dockerfile inclus)
├── Visit_Tunisia_Frontend/   # Angular (Dockerfile + nginx.conf inclus)
└── Visit_Tunisia_AI/         # FastAPI + Gemini (Dockerfile inclus)
```

## Fonctionnalités

- 🔐 Authentification JWT + vérification email
- 🏝️ Catalogue de destinations géolocalisées (PostGIS)
- 🗺️ Générateur d'itinéraires personnalisés
- 💬 Chatbot IA (Gemini) de recommandations touristiques
- 🌤️ Météo en temps réel (OpenWeatherMap)
- ❤️ Favoris, avis, comptes utilisateurs multilingues (FR/EN/AR/IT/DE)
- 📸 Upload de photos, administration avec scraping automatisé
