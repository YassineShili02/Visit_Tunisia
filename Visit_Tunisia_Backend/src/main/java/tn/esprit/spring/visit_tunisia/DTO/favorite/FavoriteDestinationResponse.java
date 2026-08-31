package tn.esprit.spring.visit_tunisia.DTO.favorite;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.Categorie;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

/**
 * Response DTO for favorite destinations list
 * Contains full destination info + favorite metadata
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FavoriteDestinationResponse {
    
    // Favorite metadata
    private Integer favoriteId;
    private LocalDateTime dateAjout;
    
    // Destination info (essential fields only)
    private Integer destinationId;
    private Map<String, String> nom;
    private String region;
    private Set<Categorie> categories;
    private BigDecimal tarifEstime;
    private String photoMain; // First photo only
    private Double latitude;
    private Double longitude;
    
    // Review stats
    private Long nombreAvis;
    private Double noteAverage;
}
