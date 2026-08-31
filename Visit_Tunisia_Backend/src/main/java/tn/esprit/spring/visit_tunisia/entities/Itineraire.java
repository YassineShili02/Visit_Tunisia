package tn.esprit.spring.visit_tunisia.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.locationtech.jts.geom.Point;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "itineraires")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Itineraire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer itineraireId;

    @NotBlank
    @Column(nullable = false)
    private String titre;

    /** Intérêts canoniques (clés FR séparées par des virgules, ex: "Culturel,Balnéaire") pour reconstruire le titre traduit */
    @Column(name = "interets", length = 500)
    private String interets;

    @Column(name = "duree_jours")
    private Integer dureeJours;

    @Column(name = "budget_total", precision = 10, scale = 2)
    private BigDecimal budgetTotal;

    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "nombre_voyageurs")
    private Integer nombreVoyageurs;

    @JsonIgnore
    @Column(name = "point_depart", columnDefinition = "geography(Point,4326)")
    private Point pointDepart;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    @OneToMany(mappedBy = "itineraire", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("ordre ASC")
    @Builder.Default
    private List<EtapeItineraire> etapes = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.dateCreation = LocalDateTime.now();
    }

    public void addEtape(EtapeItineraire etape) {
        etapes.add(etape);
        etape.setItineraire(this);
    }
}
