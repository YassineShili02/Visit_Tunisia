import logging
from fastapi import APIRouter, HTTPException
from schemas.chat import ChatRequest, ChatResponse
from services.rag_chatbot import RAGChatbotService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

_rag_service: RAGChatbotService = None


def get_rag_service() -> RAGChatbotService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGChatbotService()
    return _rag_service


@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    RAG-powered conversational endpoint for tourist guidance in Tunisia.
    Combines platform destinations data with Google Gemini generative intelligence.
    
    ⚠️ PRODUCTION TODO: Ajouter un rate limiting
    Actuellement, aucune limite de débit n'est appliquée. Un utilisateur pourrait :
    - Envoyer 50+ messages à la suite → coûts API Gemini élevés
    - Saturer le service pour les autres utilisateurs
    
    Solutions recommandées :
    - Utiliser slowapi ou fastapi-limiter (ex: 10 requêtes/minute par IP)
    - Stocker un compteur par utilisateur/session en Redis
    - Retourner 429 Too Many Requests si limite dépassée
    """
    try:
        service = get_rag_service()
        response = await service.chat(request)
        return response
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
