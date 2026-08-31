package tn.esprit.spring.visit_tunisia.DTO.utilisateur;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.Langue;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutCompte;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UtilisateurResponse {

    private Integer utilisateurId;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private RoleUtilisateur role;
    private Langue languePreferee;
    private StatutCompte statut;
    private Set<Categorie> preferences;
    private LocalDateTime dateCreation;
}
