package tn.esprit.spring.visit_tunisia.DTO.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Integer id;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private String pays;
    private LocalDate dateNaissance;
    private String role;
    private String statut;
    private boolean emailVerifie;
    private String provider;
    private String languePreferee;
    private List<String> preferences;
    private LocalDateTime dateCreation;
    private String dateCreationFormatted;
}
