package tn.esprit.spring.visit_tunisia.auth.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {

    private String token;

    @Builder.Default
    private String type = "Bearer";

    private long expiresInMs;

    private UtilisateurSummary utilisateur;

    private boolean isNewUser;

    private boolean needsProfileCompletion;

    /**
     * Indique si l'utilisateur doit vérifier son email avant de pouvoir se connecter
     * Utilisé pour les inscriptions locales (pas Google)
     */
    private boolean emailVerificationRequired;
}
