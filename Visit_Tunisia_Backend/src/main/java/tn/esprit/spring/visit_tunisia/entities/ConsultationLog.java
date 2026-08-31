package tn.esprit.spring.visit_tunisia.entities;

import jakarta.persistence.*;
import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.TypeConsultation;

import java.time.LocalDateTime;

@Entity
@Table(name = "consultation_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsultationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer logId;

    @Column(name = "terme_recherche")
    private String termeRecherche;

    @Column(name = "date_consultation", updatable = false)
    private LocalDateTime dateConsultation;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_consultation", nullable = false)
    private TypeConsultation typeConsultation;

    // Nullable : un visiteur non authentifie genere aussi des logs
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    // Rempli seulement si type_consultation = VUE_DESTINATION (ou RECHERCHE ciblee)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id")
    private Destination destination;

    // Rempli seulement si type_consultation = VUE_EVENEMENT
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evenement_id")
    private Evenement evenement;

    @PrePersist
    protected void onCreate() {
        this.dateConsultation = LocalDateTime.now();
    }
}
