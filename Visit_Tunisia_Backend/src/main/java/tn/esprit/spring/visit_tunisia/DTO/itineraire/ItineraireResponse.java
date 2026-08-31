package tn.esprit.spring.visit_tunisia.DTO.itineraire;

import lombok.*;
import tn.esprit.spring.visit_tunisia.DTO.etapeItineraire.EtapeItineraireResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItineraireResponse {

    private Integer itineraireId;
    private String titre;
    private String interets;
    private Integer dureeJours;
    private BigDecimal budgetTotal;
    private LocalDate dateDebut;
    private LocalDateTime dateCreation;
    private Integer nombreVoyageurs;
    private Double latitudeDepart;
    private Double longitudeDepart;

    private Integer utilisateurId;
    private String utilisateurNom;

    private List<EtapeItineraireResponse> etapes;
}
