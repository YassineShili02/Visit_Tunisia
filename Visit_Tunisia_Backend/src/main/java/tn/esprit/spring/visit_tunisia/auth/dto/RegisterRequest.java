package tn.esprit.spring.visit_tunisia.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;
import tn.esprit.spring.visit_tunisia.enums.Langue;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RegisterRequest {

    @NotBlank(message = "Le nom est obligatoire")
    String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    String prenom;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'adresse email doit être valide")
    String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
    String motDePasse;

    LocalDate dateNaissance;

    String telephone;

    String pays;

    Langue languePreferee;
}
