package tn.esprit.spring.visit_tunisia.DTO.recommandation;

import lombok.*;

import java.util.List;

/**
 * Représente une destination avec ses catégories, utilisée pour encoder
 * les signaux "destinationsAppreciées" et "destinationsVues" vers FastAPI.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DestinationSignal {
    private Integer destinationId;
    private List<String> categories; // noms String des Categorie enum
}
