package tn.esprit.spring.visit_tunisia.auth.dto;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;

import java.time.LocalDate;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UtilisateurSummary {

    private Integer id;
    private String nom;
    private String prenom;
    private String email;
    private RoleUtilisateur role;
    private LocalDate dateNaissance;
    private String telephone;
    private String pays;
    private Set<Categorie> preferences;
}
