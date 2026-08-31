package tn.esprit.spring.visit_tunisia.DTO.admin;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkRequestDTO {
    @NotEmpty(message = "La liste des IDs ne peut pas être vide")
    private List<Integer> ids;

    @NotNull(message = "L'action est obligatoire")
    private String action; // "PUBLISH" | "ARCHIVE"
}
