package tn.esprit.spring.visit_tunisia.DTO.etapeItineraire;

import lombok.*;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EtapeItineraireResponse {

    private Integer etapeId;
    private Integer jourNumero;
    private LocalTime heurePrevue;
    private Integer ordre;
    private Long dureeVisiteMinutes;
    private Long tempsTrajetMinutes;

    private Integer itineraireId;
    private Integer destinationId;
    private String destinationNom;
}
