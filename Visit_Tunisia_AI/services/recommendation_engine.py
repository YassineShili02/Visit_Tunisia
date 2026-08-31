import logging
import numpy as np
from typing import List
from sklearn.metrics.pairwise import cosine_similarity

from schemas.recommandation import (
    CATEGORIES_ORDER,
    RecommandationRequest,
    RecommandationScore,
    RecommandationResponse,
)

logger = logging.getLogger(__name__)

# Poids des différents signaux
WEIGHT_PREFERENCES = 3.0
WEIGHT_APPRECIEES = 2.0
WEIGHT_VUES = 1.0

# Pondération du score final
WEIGHT_SIMILARITY = 0.8
WEIGHT_RATING = 0.2
TOP_N = 8


def encode_categories(categories: List[str]) -> np.ndarray:
    """
    Encode une liste de catégories en vecteur multi-hot à 6 dimensions.
    """
    vec = np.zeros(len(CATEGORIES_ORDER), dtype=np.float32)
    normalized = {c.strip().upper() for c in categories if c}
    for idx, cat in enumerate(CATEGORIES_ORDER):
        if cat in normalized:
            vec[idx] = 1.0
    return vec


class RecommendationEngine:
    """
    Moteur de recommandation basé sur le profilage utilisateur pondéré
    et la similarité cosinus (scikit-learn).
    """

    def compute_recommendations(self, request: RecommandationRequest) -> RecommandationResponse:
        candidats = request.candidats
        if not candidats:
            logger.info("Aucun candidat fourni pour la recommandation")
            return RecommandationResponse(recommandations=[])

        # 1. Construction du vecteur utilisateur pondéré (6 dimensions)
        user_vec = np.zeros(len(CATEGORIES_ORDER), dtype=np.float32)

        # Signal 1 : Préférences explicites (poids 3)
        if request.preferences:
            pref_vec = encode_categories(request.preferences)
            user_vec += pref_vec * WEIGHT_PREFERENCES

        # Signal 2 : Destinations appréciées (note >= 4 ou sentiment positif, poids 2)
        for dest in request.destinationsAppreciees:
            dest_vec = encode_categories(dest.categories)
            user_vec += dest_vec * WEIGHT_APPRECIEES

        # Signal 3 : Destinations vues (90 derniers jours, poids 1)
        for dest in request.destinationsVues:
            dest_vec = encode_categories(dest.categories)
            user_vec += dest_vec * WEIGHT_VUES

        # Si le vecteur utilisateur est entièrement nul (aucune catégorie trouvée)
        user_norm = np.linalg.norm(user_vec)
        if user_norm == 0:
            logger.info("Vecteur utilisateur nul après pondération des signaux")
            return RecommandationResponse(recommandations=[])

        user_matrix = user_vec.reshape(1, -1)

        # 2. Construction de la matrice des candidats (N, 6)
        candidate_matrix = np.array([encode_categories(c.categories) for c in candidats], dtype=np.float32)

        # 3. Calcul de la similarité cosinus via scikit-learn
        # Forme retournée: (1, N)
        cos_sim = cosine_similarity(user_matrix, candidate_matrix)[0]

        # 4. Calcul du score final combiné
        scored_candidates = []
        for idx, candidat in enumerate(candidats):
            sim = float(cos_sim[idx])
            # Si le candidat n'a pas de catégorie ou sim < 0
            sim = max(0.0, sim)

            # Note moyenne ramenée sur [0, 1] (défaut 3.5 / 5 = 0.7)
            rating_norm = float(candidat.noteMoyenne) / 5.0 if candidat.noteMoyenne is not None else 0.7
            rating_norm = max(0.0, min(1.0, rating_norm))

            score_final = (WEIGHT_SIMILARITY * sim) + (WEIGHT_RATING * rating_norm)

            scored_candidates.append(
                RecommandationScore(
                    destinationId=candidat.destinationId,
                    score=round(score_final, 4),
                )
            )

        # 5. Tri décroissant par score
        scored_candidates.sort(key=lambda x: x.score, reverse=True)

        # 6. Retourner les top 8
        top_results = scored_candidates[:TOP_N]
        logger.info(f"Recommandations calculées avec succès : {len(top_results)} destinations retournées")
        return RecommandationResponse(recommandations=top_results)
