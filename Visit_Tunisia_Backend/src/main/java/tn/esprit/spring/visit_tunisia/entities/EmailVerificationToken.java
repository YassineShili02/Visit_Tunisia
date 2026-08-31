package tn.esprit.spring.visit_tunisia.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Token de vérification d'email envoyé lors de l'inscription.
 * Contient un code à 6 chiffres valide pendant 24 heures.
 */
@Entity
@Table(name = "email_verification_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * Code de vérification à 6 chiffres (ex: 123456)
     */
    @Column(nullable = false, unique = true, length = 6)
    private String code;

    /**
     * Utilisateur concerné par cette vérification
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    /**
     * Date d'expiration du code (24h après création)
     */
    @Column(nullable = false)
    private LocalDateTime dateExpiration;

    /**
     * Indicateur si le code a déjà été utilisé
     */
    @Column(nullable = false)
    private boolean utilise = false;

    /**
     * Date de création du token
     */
    @Column(nullable = false)
    private LocalDateTime dateCreation;

    @PrePersist
    protected void onCreate() {
        if (dateCreation == null) {
            dateCreation = LocalDateTime.now();
        }
        if (dateExpiration == null) {
            // Par défaut: expire dans 24 heures
            dateExpiration = LocalDateTime.now().plusHours(24);
        }
    }

    /**
     * Vérifie si le token est expiré
     */
    public boolean isExpire() {
        return LocalDateTime.now().isAfter(dateExpiration);
    }

    /**
     * Vérifie si le token est valide (non utilisé et non expiré)
     */
    public boolean isValide() {
        return !utilise && !isExpire();
    }
}
