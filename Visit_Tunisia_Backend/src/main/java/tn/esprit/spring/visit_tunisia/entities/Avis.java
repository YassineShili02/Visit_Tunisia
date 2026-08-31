package tn.esprit.spring.visit_tunisia.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.StatutModeration;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "avis", uniqueConstraints = @UniqueConstraint(columnNames = {"utilisateur_id", "destination_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Avis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer avisId;

    @Min(1)
    @Max(5)
    @Column(nullable = false)
    private Integer note;

    @Column(length = 2000)
    private String commentaire;

    // Rempli par le microservice IA (analyse de sentiment)
    @Column(name = "sentiment_label")
    private String sentimentLabel;

    @Column(name = "sentiment_score", precision = 5, scale = 4)
    private BigDecimal sentimentScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_moderation")
    private StatutModeration statutModeration;

    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    // Un avis porte soit sur une destination, soit sur un evenement (l'un des deux, nullable)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id")
    private Destination destination;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evenement_id")
    private Evenement evenement;


    @PrePersist
    protected void onCreate() {
        this.dateCreation = LocalDateTime.now();
        if (this.statutModeration == null) {
            // Publication automatique par défaut
            this.statutModeration = StatutModeration.VALIDE;
        }
    }
}
