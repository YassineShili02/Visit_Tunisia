import logging
from fastapi import APIRouter, HTTPException
from schemas.recommandation import RecommandationRequest, RecommandationResponse
from services.recommendation_engine import RecommendationEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recommandations", tags=["recommandations"])

engine = RecommendationEngine()


@router.post("/calculer", response_model=RecommandationResponse)
async def calculer_recommandations(request: RecommandationRequest):
    """
    Calcule les recommandations personnalisées basées sur :
    - Les préférences de l'utilisateur (poids 3)
    - Les destinations appréciées (note >= 4 ou sentiment positif, poids 2)
    - Les destinations vues récemment (poids 1)
    - La similarité cosinus avec les destinations candidates
    - La note moyenne des destinations
    """
    try:
        logger.info(
            f"Calcul des recommandations : {len(request.preferences)} préférences, "
            f"{len(request.destinationsAppreciees)} appréciées, "
            f"{len(request.destinationsVues)} vues, "
            f"{len(request.candidats)} candidats"
        )
        return engine.compute_recommendations(request)
    except Exception as e:
        logger.error(f"Erreur lors du calcul des recommandations : {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur interne du moteur de recommandation: {str(e)}")
