package tn.esprit.spring.visit_tunisia.DTO.itineraire;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ItineraireRequest {

    @NotBlank(message = "Le titre est obligatoire")
    String titre;

    String interets;

    Integer dureeJours;

    BigDecimal budgetTotal;

    LocalDate dateDebut;

    Integer nombreVoyageurs;

    Double latitudeDepart;

    Double longitudeDepart;

    @NotNull(message = "L'utilisateur est obligatoire")
    Integer utilisateurId;
}
