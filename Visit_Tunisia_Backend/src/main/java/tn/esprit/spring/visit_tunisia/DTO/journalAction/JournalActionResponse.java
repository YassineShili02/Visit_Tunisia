package tn.esprit.spring.visit_tunisia.DTO.journalAction;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.EntiteType;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;
import tn.esprit.spring.visit_tunisia.enums.TypeAction;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JournalActionResponse {

    private Integer journalId;
    private TypeAction typeAction;
    private EntiteType entiteType;
    private String details;
    private LocalDateTime dateAction;

    private Integer utilisateurId;
    private String utilisateurNom;
    private String utilisateurEmail;
    private RoleUtilisateur utilisateurRole;
}
