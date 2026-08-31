package tn.esprit.spring.visit_tunisia.DTO.message;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.TypeExpediteur;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageResponse {

    private Integer messageId;
    private TypeExpediteur expediteurType;
    private String contenu;
    private LocalDateTime dateEnvoi;

    private Integer conversationId;
}
