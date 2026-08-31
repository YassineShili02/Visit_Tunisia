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

   Deux modes possibles — **recommandé : télécharger les images pré-construites** (rapide, aucune compilation) :

   ```bash
   # Mode rapide : telecharge les images Docker Hub (aucune compilation)
   docker compose up -d
   ```

   > ⚙️ Pour définir une version précise des images (au lieu de `latest`) :
   > ```bash
   > TAG=abc1234 docker compose up -d
   > ```

   **Ou** mode développement : reconstruire localement depuis le code source :

   ```bash
   # Mode dev : recompile Angular + Maven + Python dans les images
   docker compose up --build -d
   ```

4. **Ouvrir le navigateur** : http://localhost:4200

> ⏳ Le premier lancement télécharge les images (~1 min). Le mode `--build` peut prendre 5-10 min (compilation).
> 💡 Les images sont poussées automatiquement sur [Docker Hub](https://hub.docker.com/u/yassineshili) par la CI à chaque push sur `main`.

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
├── .github/workflows/ci.yml  # Pipeline CI/CD (GitHub Actions)
├── Visit_Tunisia_Backend/    # Spring Boot + Python scrapers (Dockerfile inclus)
├── Visit_Tunisia_Frontend/   # Angular (Dockerfile + nginx.conf inclus)
└── Visit_Tunisia_AI/         # FastAPI + Gemini (Dockerfile inclus)
```

## CI/CD (GitHub Actions)

À chaque push ou PR vers `main`, le pipeline `.github/workflows/ci.yml` :

1. **Backend** : tests JUnit (contre un service PostGIS dédié) + empaquetage du jar
2. **Frontend** : `npm ci` + build production Angular
3. **AI** : installation Python + vérification de l'import
4. **Images Docker** : construction des 3 images (backend, frontend, ai)

Si la variable GitHub `PUSH_IMAGES=true`, les 3 images sont **poussées sur Docker Hub**
(`yassineshili/visit_tunisia_*`) avec les tags `latest` et le SHA du commit.

**Secrets GitHub requis** : `JWT_SECRET`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `WEATHER_API_KEY`
(+ `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` si `PUSH_IMAGES=true`).

## Fonctionnalités

- 🔐 Authentification JWT + vérification email
- 🏝️ Catalogue de destinations géolocalisées (PostGIS)
- 🗺️ Générateur d'itinéraires personnalisés
- 💬 Chatbot IA (Gemini) de recommandations touristiques
- 🌤️ Météo en temps réel (OpenWeatherMap)
- ❤️ Favoris, avis, comptes utilisateurs multilingues (FR/EN/AR/IT/DE)
- 📸 Upload de photos, administration avec scraping automatisé
