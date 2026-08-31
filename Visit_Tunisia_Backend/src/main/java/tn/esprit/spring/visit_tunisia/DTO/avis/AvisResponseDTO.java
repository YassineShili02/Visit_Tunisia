package tn.esprit.spring.visit_tunisia.DTO.avis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.esprit.spring.visit_tunisia.enums.StatutModeration;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvisResponseDTO {

    private Integer avisId;
    private Integer note;
    private String commentaire;
    private String authorName;
    private String authorAvatar;
    private String authorEmail;
    private LocalDateTime dateCreation;
    private Boolean isMine;
    
    // Additional fields for user's review list
    private String destinationNom;
    private Integer destinationId;
    private String categorie;
    private java.util.List<String> categories;
    private StatutModeration statutModeration;
    private String sentimentLabel;
    private Double sentimentScore;
}
