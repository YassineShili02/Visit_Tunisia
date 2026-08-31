package tn.esprit.spring.visit_tunisia.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GoogleAuthRequest {

    @NotBlank(message = "Le jeton Google (idToken) est obligatoire")
    String idToken;
}
