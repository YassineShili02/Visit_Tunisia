package tn.esprit.spring.visit_tunisia.DTO.evenement;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvenementResponse {

    private Integer evenementId;
    private Map<String, String> nom;
    private Map<String, String> description;
    private String genre;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private StatutPublication statut;
    private BigDecimal tarif;
    private List<String> photos;

    private Integer destinationId;
    private String destinationNom;
    private String destinationRegion;

    // Lieu libre si pas de destination catalogue
    private String lieuLibre;

    // Lien officiel / billetterie / inscription
    private String lienEvenement;
}
