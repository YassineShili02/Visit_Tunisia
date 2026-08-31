package tn.esprit.spring.visit_tunisia.DTO.message;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;
import tn.esprit.spring.visit_tunisia.enums.TypeExpediteur;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MessageRequest {

    @NotNull(message = "Le type d'expéditeur est obligatoire")
    TypeExpediteur expediteurType;

    @NotBlank(message = "Le contenu du message est obligatoire")
    String contenu;

    @NotNull(message = "La conversation est obligatoire")
    Integer conversationId;
}
