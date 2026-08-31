package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.DTO.favorite.FavoriteDestinationResponse;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;
import tn.esprit.spring.visit_tunisia.services.FavoriteService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class FavoriteController {

    private final FavoriteService favoriteService;
    private final UtilisateurRepository utilisateurRepository;

    @PostMapping("/{destinationId}")
    public ResponseEntity<Map<String, String>> addFavorite(
            @PathVariable Integer destinationId,
            Authentication authentication
    ) {
        Integer userId = extractUserId(authentication);
        log.info("[FavoriteController] POST /api/favorites/{} - User {}", destinationId, userId);
        favoriteService.addFavorite(userId, destinationId);
        return ResponseEntity.ok(Map.of("message", "Destination ajoutée aux favoris"));
    }

    @DeleteMapping("/{destinationId}")
    public ResponseEntity<Map<String, String>> removeFavorite(
            @PathVariable Integer destinationId,
            Authentication authentication
    ) {
        Integer userId = extractUserId(authentication);
        log.info("[FavoriteController] DELETE /api/favorites/{} - User {}", destinationId, userId);
        favoriteService.removeFavorite(userId, destinationId);
        return ResponseEntity.ok(Map.of("message", "Destination retirée des favoris"));
    }

    @GetMapping
    public ResponseEntity<List<FavoriteDestinationResponse>> getUserFavorites(Authentication authentication) {
        Integer userId = extractUserId(authentication);
        log.info("[FavoriteController] GET /api/favorites - User {}", userId);
        return ResponseEntity.ok(favoriteService.getUserFavorites(userId));
    }

    @GetMapping("/ids")
    public ResponseEntity<List<Integer>> getUserFavoriteIds(Authentication authentication) {
        Integer userId = extractUserId(authentication);
        log.info("[FavoriteController] GET /api/favorites/ids - User {}", userId);
        return ResponseEntity.ok(favoriteService.getUserFavoriteIds(userId));
    }

    /**
     * Extract user ID from JWT authentication.
     * The principal is a Spring Security UserDetails (email as username),
     * NOT a UtilisateurSummary — so we resolve the ID via the repository.
     */
    private Integer extractUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Utilisateur non authentifié");
        }

        String email;
        Object principal = authentication.getPrincipal();

        if (principal instanceof UserDetails userDetails) {
            email = userDetails.getUsername(); // username = email in this app
        } else if (principal instanceof String str) {
            email = str;
        } else {
            throw new RuntimeException("Format d'authentification invalide: " + principal.getClass().getName());
        }

        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable pour l'email: " + email));

        return user.getUtilisateurId();
    }
}
