package tn.esprit.spring.visit_tunisia.DTO.evenement;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EvenementRequest {

    @NotNull(message = "Le nom de l'événement est obligatoire")
    Map<String, String> nom;

    Map<String, String> description;

    String genre;

    LocalDate dateDebut;

    LocalDate dateFin;

    StatutPublication statut;

    BigDecimal tarif;

    List<String> photos;

    // Destination catalogue (optionnelle)
    Integer destinationId;

    // Lieu en texte libre si pas de destination catalogue
    String lieuLibre;

    // Lien officiel / billetterie / inscription
    String lienEvenement;
}
