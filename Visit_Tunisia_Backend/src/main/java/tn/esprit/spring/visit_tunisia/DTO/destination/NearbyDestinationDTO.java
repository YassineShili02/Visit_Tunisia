package tn.esprit.spring.visit_tunisia.DTO.destination;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyDestinationDTO {
    
    private Integer destinationId;
    private Map<String, String> nom;
    private String type;
    private Set<String> categories;
    private String region;
    private Double latitude;
    private Double longitude;
    private BigDecimal tarifEstime;
    private String imageUrl; // First photo
    private Double distanceKm; // Distance from current destination in km
    private Double noteMoyenne;
    private Long nombreAvis;
}
