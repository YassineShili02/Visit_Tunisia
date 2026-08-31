package tn.esprit.spring.visit_tunisia.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.hypersistence.utils.hibernate.type.array.ListArrayType;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "evenements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evenement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer evenementId;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, String> nom;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> description;

    private String genre;

    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Enumerated(EnumType.STRING)
    private StatutPublication statut;

    @Column(precision = 10, scale = 2)
    private BigDecimal tarif;

    @Type(ListArrayType.class)
    @Column(columnDefinition = "text[]")
    private List<String> photos;

    // Destination liée dans le catalogue (optionnelle)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = true)
    private Destination destination;

    // Lieu en texte libre si la destination n'est pas dans le catalogue (ex: Cité de la Culture)
    @Column(name = "lieu_libre")
    private String lieuLibre;

    // Lien officiel ou lien d'inscription / billetterie (ex: https://...)
    @Column(name = "lien_evenement")
    private String lienEvenement;

    @JsonIgnore
    @OneToMany(mappedBy = "evenement")
    @Builder.Default
    private List<Avis> avis = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "evenement")
    @Builder.Default
    private List<ConsultationLog> consultationLogs = new ArrayList<>();
}
