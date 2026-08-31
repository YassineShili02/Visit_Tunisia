package tn.esprit.spring.visit_tunisia.entities;

import jakarta.persistence.*;
import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.EntiteType;
import tn.esprit.spring.visit_tunisia.enums.TypeAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "journal_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JournalAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer journalId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_action", nullable = false)
    private TypeAction typeAction;

    @Enumerated(EnumType.STRING)
    @Column(name = "entite_type", nullable = false)
    private EntiteType entiteType;

    @Column(columnDefinition = "text")
    private String details;

    @Column(name = "date_action", updatable = false)
    private LocalDateTime dateAction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id",nullable = false)
    private Utilisateur utilisateur;

    @PrePersist
    protected void onCreate() {
        this.dateAction = LocalDateTime.now();
    }
}
