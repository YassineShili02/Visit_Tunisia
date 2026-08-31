package tn.esprit.spring.visit_tunisia.DTO.avis;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AvisRequest {

    @Min(value = 1, message = "La note minimale est 1")
    @Max(value = 5, message = "La note maximale est 5")
    @NotNull(message = "La note est obligatoire")
    Integer note;

    String commentaire;

    @NotNull(message = "L'utilisateur est obligatoire")
    Integer utilisateurId;

    Integer destinationId;

    Integer evenementId;
}
