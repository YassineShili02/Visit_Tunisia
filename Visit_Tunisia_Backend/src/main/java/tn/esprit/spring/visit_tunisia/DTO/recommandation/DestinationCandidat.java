package tn.esprit.spring.visit_tunisia.DTO.recommandation;

import lombok.*;

import java.util.List;

/**
 * Représente une destination candidate pour la recommandation,
 * avec ses catégories et ses métriques agrégées.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DestinationCandidat {
    private Integer destinationId;
    private List<String> categories;
    /** Note moyenne (1-5). Défaut 3.5 si jamais avisée. */
    private double noteMoyenne;
    /** Score sentiment moyen (0-1). Défaut 0.5 si jamais avisée. */
    private double sentimentMoyen;
}
