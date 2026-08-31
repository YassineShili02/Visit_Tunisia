package tn.esprit.spring.visit_tunisia.DTO.destination;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.Categorie;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

/**
 * Lightweight DTO for map pins - only essential data for map markers
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DestinationPinResponse {
    private Integer destinationId;
    private Map<String, String> nom;
    private Double latitude;
    private Double longitude;
    private Set<Categorie> categories;
    private BigDecimal tarifEstime;
    private String img; // First photo only for marker popup
}
