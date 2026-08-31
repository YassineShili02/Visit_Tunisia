package tn.esprit.spring.visit_tunisia.DTO.admin;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusPatchDTO {
    private StatutPublication statut;
}
