package tn.esprit.spring.visit_tunisia.DTO.conversation;

import lombok.*;
import tn.esprit.spring.visit_tunisia.enums.Langue;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationResponse {

    private Integer conversationId;
    private Langue langue;
    private String titre;
    private LocalDateTime dateCreation;

    private Integer utilisateurId;
    private String utilisateurNom;
}
