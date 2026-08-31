package tn.esprit.spring.visit_tunisia.DTO.admin;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CountsResponseDTO {
    private long total;
    private long actif;
    private long brouillon;
    private long archive;
}
