package tn.esprit.spring.visit_tunisia.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.AuthProvider;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.Langue;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutCompte;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "utilisateurs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer utilisateurId;

    @NotBlank
    @Column(nullable = false)
    private String nom;

    @NotBlank
    @Column(nullable = false)
    private String prenom;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "mot_de_passe", nullable = true)
    private String motDePasse;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    private String telephone;

    private String pays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoleUtilisateur role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider;

    @Column(name = "provider_id")
    private String providerId;

    @Enumerated(EnumType.STRING)
    private Langue languePreferee;

    @Enumerated(EnumType.STRING)
    private StatutCompte statut;

    /**
     * Indicateur si l'email a été vérifié après inscription.
     * Pour les comptes Google, ce champ est true par défaut car Google vérifie déjà l'email.
     * Pour les comptes locaux, l'utilisateur doit valider son email via un code à 6 chiffres.
     */
    @Column(name = "email_verifie", nullable = false)
    @Builder.Default
    private boolean emailVerifie = false;

    @ElementCollection(targetClass = Categorie.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "utilisateur_preferences", joinColumns = @JoinColumn(name = "utilisateur_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "categorie")
    @Builder.Default
    private Set<Categorie> preferences = new HashSet<>();

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @JsonIgnore
    @OneToMany(mappedBy = "utilisateur")
    @Builder.Default
    private List<Itineraire> itineraires = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "utilisateur")
    @Builder.Default
    private List<Avis> avis = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "utilisateur")
    @Builder.Default
    private List<Conversation> conversations = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "utilisateur")
    @Builder.Default
    private List<JournalAction> journalActions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.dateCreation = LocalDateTime.now();
        if (this.statut == null) {
            // Par défaut, un nouveau compte local attend la vérification de son email.
            // Pour les comptes Google (provider != LOCAL), le code appelant doit setter
            // explicitement statut=ACTIF car l'email est déjà vérifié par Google.
            this.statut = (this.provider != null && this.provider != AuthProvider.LOCAL)
                    ? StatutCompte.ACTIF
                    : StatutCompte.EN_ATTENTE_VERIFICATION;
        }
        if (this.provider == null) {
            this.provider = AuthProvider.LOCAL;
        }
    }
}
