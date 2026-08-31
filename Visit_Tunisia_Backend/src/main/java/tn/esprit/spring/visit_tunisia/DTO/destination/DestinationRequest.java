package tn.esprit.spring.visit_tunisia.DTO.destination;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.enums.TypeDestination;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DestinationRequest {

    @NotNull(message = "Le nom multilingue est obligatoire")
    Map<String, String> nom;

    Map<String, String> description;

    @NotNull(message = "Le type de destination est obligatoire")
    TypeDestination type;

    Set<Categorie> categories;

    String region;

    Double latitude;

    Double longitude;

    Map<String, Object> horaires;

    Map<String, Object> attributsSpecifiques;

    BigDecimal tarifEstime;

    Boolean accessibilitePmr;

    List<String> photos;

    StatutPublication statut;
}
