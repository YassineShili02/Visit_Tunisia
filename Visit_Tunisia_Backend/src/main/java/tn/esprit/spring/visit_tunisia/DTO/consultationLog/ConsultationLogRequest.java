package tn.esprit.spring.visit_tunisia.DTO.consultationLog;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;
import tn.esprit.spring.visit_tunisia.enums.TypeConsultation;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConsultationLogRequest {

    String termeRecherche;

    @NotNull(message = "Le type de consultation est obligatoire")
    TypeConsultation typeConsultation;

    Integer utilisateurId;

    Integer destinationId;

    Integer evenementId;
}
