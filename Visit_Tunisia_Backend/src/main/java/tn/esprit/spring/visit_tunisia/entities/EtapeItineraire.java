package tn.esprit.spring.visit_tunisia.entities;

import io.hypersistence.utils.hibernate.type.interval.PostgreSQLIntervalType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.Duration;
import java.time.LocalTime;

@Entity
@Table(name = "etapes_itineraire")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EtapeItineraire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer etapeId;

    @Column(name = "jour_numero")
    private Integer jourNumero;

    @Column(name = "heure_prevue")
    private LocalTime heurePrevue;

    private Integer ordre;

    @Type(PostgreSQLIntervalType.class)
    @Column(name = "duree_visite", columnDefinition = "interval")
    private Duration dureeVisite;

    @Type(PostgreSQLIntervalType.class)
    @Column(name = "temps_trajet", columnDefinition = "interval")
    private Duration tempsTrajet;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "itineraire_id", nullable = false)
    private Itineraire itineraire;

    // Destination visitée à cette étape
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;
}
