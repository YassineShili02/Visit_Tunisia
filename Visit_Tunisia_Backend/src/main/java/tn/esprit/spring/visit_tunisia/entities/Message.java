package tn.esprit.spring.visit_tunisia.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.TypeExpediteur;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer messageId;

    @Enumerated(EnumType.STRING)
    @Column(name = "expediteur_type", nullable = false)
    private TypeExpediteur expediteurType;

    @NotBlank
    @Column(columnDefinition = "text", nullable = false)
    private String contenu;

    @Column(name = "date_envoi", updatable = false)
    private LocalDateTime dateEnvoi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @PrePersist
    protected void onCreate() {
        this.dateEnvoi = LocalDateTime.now();
    }
}
