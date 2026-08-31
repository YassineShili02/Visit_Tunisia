import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import sentiment, recommandations, chat

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Visit Tunisia AI Service",
    description="Microservice for AI-powered features: sentiment analysis, recommendations, RAG chatbot",
    version="1.0.0"
)

# CORS configuration for Spring Boot backend and Angular frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",  # Angular Frontend
        "http://localhost:8082",  # Spring Boot ports
        "http://localhost:8080",
        "http://127.0.0.1:4200",
        "http://127.0.0.1:8082",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sentiment.router)
app.include_router(recommandations.router)
app.include_router(chat.router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Visit Tunisia AI",
        "status": "running",
        "version": "1.0.0",
        "features": ["sentiment_analysis", "recommandations", "rag_chatbot"]
    }

@app.get("/health")
async def health():
    """Health check for monitoring"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Visit Tunisia AI Service on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
