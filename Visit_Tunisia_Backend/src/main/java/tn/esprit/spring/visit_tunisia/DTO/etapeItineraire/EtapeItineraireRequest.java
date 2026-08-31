package tn.esprit.spring.visit_tunisia.DTO.etapeItineraire;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EtapeItineraireRequest {

    Integer jourNumero;

    LocalTime heurePrevue;

    Integer ordre;

    Long dureeVisiteMinutes;

    Long tempsTrajetMinutes;

    @NotNull(message = "L'itinéraire est obligatoire")
    Integer itineraireId;

    @NotNull(message = "La destination est obligatoire")
    Integer destinationId;
}
