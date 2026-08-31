package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationResponse;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;
import tn.esprit.spring.visit_tunisia.services.RecommandationService;

import java.util.List;

@RestController
@RequestMapping("/api/recommandations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class RecommandationController {

    private final RecommandationService recommandationService;
    private final UtilisateurRepository utilisateurRepository;

    /**
     * GET /api/recommandations
     *
     * Retourne la liste des destinations recommandées pour l'utilisateur connecté.
     * Authentification requise (JWT via Authorization: Bearer <token>).
     *
     * - Si l'utilisateur n'a aucune donnée personnelle : retourne [] (200 OK)
     * - Sinon : retourne la liste ordonnée par score cosinus (max 8 destinations)
     */
    @GetMapping
    public ResponseEntity<List<DestinationResponse>> getRecommandations() {
        // Résolution de l'utilisateur depuis le SecurityContext
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            log.warn("[Recommandation] Requête non authentifiée rejetée");
            return ResponseEntity.status(401).build();
        }

        String email = auth.getName();
        Utilisateur user = utilisateurRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.warn("[Recommandation] Utilisateur introuvable pour email={}", email);
            return ResponseEntity.ok(List.of());
        }

        log.info("[Recommandation] GET /api/recommandations pour user #{} ({})", user.getUtilisateurId(), email);

        List<DestinationResponse> recommandations = recommandationService.getRecommandations(user);
        return ResponseEntity.ok(recommandations);
    }
}
