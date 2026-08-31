# Visit Tunisia AI Service

Microservice Python/FastAPI pour les fonctionnalités IA du projet Visit Tunisia.

## Fonctionnalités actuelles

- ✅ Analyse de sentiment des avis (via Google Gemini API)

## Fonctionnalités futures

- 🔜 Recommandations par similarité cosinus
- 🔜 Chatbot RAG (Retrieval-Augmented Generation)

## Installation

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

1. Copier `.env.example` vers `.env`
2. Ajouter votre clé API Gemini dans `.env`

```bash
GEMINI_API_KEY=your_actual_key_here
```

## Démarrage

```bash
# Development mode with auto-reload
uvicorn main:app --reload --port 8000

# Production mode
python main.py
```

## API Documentation

Une fois démarré, la documentation interactive est disponible sur :
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Architecture

```
Visit_Tunisia_AI/
├── main.py                 # FastAPI application entry point
├── routers/
│   └── sentiment.py        # Sentiment analysis routes
├── services/
│   └── gemini_client.py    # Gemini API wrapper
├── schemas/
│   └── sentiment.py        # Pydantic models
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (gitignored)
└── .env.example            # Environment variables template
```

## Endpoints

### POST /sentiment/analyser

Analyse le sentiment d'un commentaire.

**Request:**
```json
{
  "commentaire": "Une très bonne destination, je recommande!"
}
```

**Response:**
```json
{
  "score": 0.85
}
```

Le score est compris entre 0.0 (très négatif) et 1.0 (très positif).
Le label (NEGATIF/NEUTRE/POSITIF) est calculé par le backend Spring Boot.
