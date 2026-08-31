package tn.esprit.spring.visit_tunisia.DTO.recommandation;

import lombok.*;

import java.util.List;

/**
 * Corps de la requête POST /recommandations/calculer envoyée au microservice FastAPI.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommandationAIRequest {
    /** Catégories des préférences explicites (poids 3). */
    private List<String> preferences;
    /** Destinations appréciées par l'utilisateur (note >= 4 OU sentiment=POSITIF, poids 2). */
    private List<DestinationSignal> destinationsAppreciees;
    /** Destinations vues dans les 90 derniers jours (poids 1). */
    private List<DestinationSignal> destinationsVues;
    /** Toutes les destinations candidates ACTIF non déjà avisées. */
    private List<DestinationCandidat> candidats;
}
