package tn.esprit.spring.visit_tunisia.DTO.consultationLog;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.TypeConsultation;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsultationLogResponse {

    private Integer logId;
    private String termeRecherche;
    private LocalDateTime dateConsultation;
    private TypeConsultation typeConsultation;

    private Integer utilisateurId;
    private Integer destinationId;
    private Integer evenementId;
}
