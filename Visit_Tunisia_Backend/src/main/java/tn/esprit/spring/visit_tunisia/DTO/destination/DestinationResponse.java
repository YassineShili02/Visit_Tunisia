package tn.esprit.spring.visit_tunisia.DTO.destination;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.enums.TypeDestination;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DestinationResponse {

    private Integer destinationId;
    private Map<String, String> nom;
    private Map<String, String> description;
    private TypeDestination type;
    private Set<Categorie> categories;
    private String region;
    private Double latitude;
    private Double longitude;
    private Map<String, Object> horaires;
    private Map<String, Object> attributsSpecifiques;
    private BigDecimal tarifEstime;
    private Boolean accessibilitePmr;
    private List<String> photos;
    private StatutPublication statut;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Avis aggregations
    private Long nombreAvis;
    private Double noteAverage;
}
