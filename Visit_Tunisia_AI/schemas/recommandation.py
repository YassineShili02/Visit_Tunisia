from pydantic import BaseModel, Field
from typing import List

# Les 6 catégories de l'enum Java Categorie — ordre fixe pour le vecteur multi-hot
CATEGORIES_ORDER = ['CULTUREL', 'BALNEAIRE', 'ECOLOGIQUE', 'GASTRONOMIQUE', 'AVENTURE', 'RELIGIEUX']


class DestinationSignal(BaseModel):
    """Signal d'une destination appréciée ou vue."""
    destinationId: int
    categories: List[str] = Field(default_factory=list)


class DestinationCandidat(BaseModel):
    """Destination candidate avec catégories et métriques agrégées."""
    destinationId: int
    categories: List[str] = Field(default_factory=list)
    noteMoyenne: float = Field(default=3.5, ge=0.0, le=5.0)
    sentimentMoyen: float = Field(default=0.5, ge=0.0, le=1.0)


class RecommandationRequest(BaseModel):
    """Corps de la requête POST /recommandations/calculer reçue depuis Spring Boot."""
    preferences: List[str] = Field(default_factory=list)
    destinationsAppreciees: List[DestinationSignal] = Field(default_factory=list)
    destinationsVues: List[DestinationSignal] = Field(default_factory=list)
    candidats: List[DestinationCandidat] = Field(default_factory=list)


class RecommandationScore(BaseModel):
    """Score calculé pour une destination candidate."""
    destinationId: int
    score: float


class RecommandationResponse(BaseModel):
    """Réponse du moteur de recommandation : liste triée décroissante, max 8."""
    recommandations: List[RecommandationScore]
