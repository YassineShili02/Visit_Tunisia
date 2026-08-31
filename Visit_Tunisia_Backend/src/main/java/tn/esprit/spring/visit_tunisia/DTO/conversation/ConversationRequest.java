package tn.esprit.spring.visit_tunisia.DTO.conversation;

import lombok.*;
import lombok.experimental.FieldDefaults;
import tn.esprit.spring.visit_tunisia.enums.Langue;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConversationRequest {

    Langue langue;

    String titre;

    Integer utilisateurId;
}
