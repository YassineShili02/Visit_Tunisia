package tn.esprit.spring.visit_tunisia.DTO.avis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvisStatsDTO {

    private Double noteMoyenne;
    private Long totalAvis;
    private Map<Integer, Long> distributionEtoiles; // 5: count, 4: count, etc.
    private List<AvisResponseDTO> avisList;
}
