package tn.esprit.spring.visit_tunisia.DTO.avis;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.StatutModeration;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvisResponse {

    private Integer avisId;
    private Integer note;
    private String commentaire;
    private String sentimentLabel;
    private BigDecimal sentimentScore;
    private StatutModeration statutModeration;
    private LocalDateTime dateCreation;

    private Integer utilisateurId;
    private String utilisateurNom;
    private Integer destinationId;
    private Integer evenementId;
}
