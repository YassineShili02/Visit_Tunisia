package tn.esprit.spring.visit_tunisia.auth.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;
import tn.esprit.spring.visit_tunisia.enums.Categorie;

import java.time.LocalDate;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CompleteProfileRequest {

    LocalDate dateNaissance;

    String telephone;

    String pays;

    Set<Categorie> preferences;

    /** Langue préférée (FR/EN/AR/IT/DE) — appliquée par défaut à chaque connexion */
    String languePreferee;
}
