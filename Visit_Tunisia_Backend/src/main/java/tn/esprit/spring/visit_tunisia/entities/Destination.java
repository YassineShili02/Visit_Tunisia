package tn.esprit.spring.visit_tunisia.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.hypersistence.utils.hibernate.type.array.ListArrayType;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.Type;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.enums.TypeDestination;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "destinations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Destination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer destinationId;

    // jsonb multilingue : { "fr": "...", "en": "...", "ar": "..." }
    @NotNull
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, String> nom;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeDestination type;

    @ElementCollection(targetClass = Categorie.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "destination_categories", joinColumns = @JoinColumn(name = "destination_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "categorie")
    @Builder.Default
    private Set<Categorie> categories = new HashSet<>();

    private String region;

    // Direct latitude and longitude fields
    private Double latitude;
    private Double longitude;

    // PostGIS via hibernate-spatial: POINT(longitude latitude)
    @JsonIgnore
    @Column(columnDefinition = "geography(Point,4326)")
    private Point localisation;

    // jsonb libre (horaires d'ouverture par jour, etc.)
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> horaires;

    @Type(JsonType.class)
    @Column(name = "attributs_specifiques", columnDefinition = "jsonb")
    private Map<String, Object> attributsSpecifiques;

    @Column(name = "tarif_estime", precision = 10, scale = 2)
    private BigDecimal tarifEstime;

    @Column(name = "accessibilite_pmr")
    private Boolean accessibilitePmr;

    // text_array natif Postgres via hypersistence-utils
    @Type(ListArrayType.class)
    @Column(columnDefinition = "text[]")
    private List<String> photos;

    @Enumerated(EnumType.STRING)
    private StatutPublication statut;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "destination", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<Evenement> evenements = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "destination")
    @Builder.Default
    private List<Avis> avis = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "destination")
    @Builder.Default
    private List<ConsultationLog> consultationLogs = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "destination")
    @Builder.Default
    private List<EtapeItineraire> etapes = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        this.updatedAt = LocalDateTime.now();
        if (this.statut == null) {
            this.statut = StatutPublication.BROUILLON;
        }
        if (this.accessibilitePmr == null) {
            this.accessibilitePmr = false;
        }
        updateLocalisationFromCoords();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        updateLocalisationFromCoords();
    }

    public void updateLocalisationFromCoords() {
        if (this.latitude != null && this.longitude != null) {
            GeometryFactory gf = new GeometryFactory(new PrecisionModel(), 4326);
            // POINT(longitude latitude) - lon first, lat second
            this.localisation = gf.createPoint(new Coordinate(this.longitude, this.latitude));
        }
    }
}
