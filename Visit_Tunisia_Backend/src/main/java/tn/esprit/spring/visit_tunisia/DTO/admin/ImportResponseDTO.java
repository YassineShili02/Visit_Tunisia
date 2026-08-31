package tn.esprit.spring.visit_tunisia.DTO.admin;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportResponseDTO {
    private String status;  // "PENDING"
    private String message;
}
