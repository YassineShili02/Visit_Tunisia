import logging
from fastapi import APIRouter, HTTPException
from schemas.sentiment import SentimentRequest, SentimentResponse
from services.gemini_client import GeminiClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sentiment", tags=["sentiment"])

# Initialize Gemini client once at startup
gemini_client = None


def get_gemini_client() -> GeminiClient:
    """Lazy initialization of Gemini client"""
    global gemini_client
    if gemini_client is None:
        gemini_client = GeminiClient()
    return gemini_client


@router.post("/analyser", response_model=SentimentResponse)
async def analyser_sentiment(request: SentimentRequest):
    """
    Analyze sentiment of a review comment.
    
    Returns only the sentiment polarity score (0.0-1.0).
    The label (NEGATIF/NEUTRE/POSITIF) is calculated by the backend.
    
    Supported languages: French, Arabic, English, Italian, German.
    """
    try:
        logger.info(f"Received sentiment analysis request (comment length: {len(request.commentaire)} chars)")
        
        client = get_gemini_client()
        score = client.analyze_sentiment(request.commentaire)
        
        logger.info(f"✓ Analysis complete: score={score:.4f}")
        
        return SentimentResponse(score=score)
        
    except ValueError as e:
        # Invalid format from Gemini after retries
        logger.error(f"✗ Format validation error: {e}")
        raise HTTPException(status_code=422, detail=f"Invalid response format from AI model: {str(e)}")
        
    except Exception as e:
        # Network errors or unexpected issues
        logger.error(f"✗ Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")
