package tn.esprit.spring.visit_tunisia.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisRequestDTO;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisResponseDTO;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisStatsDTO;
import tn.esprit.spring.visit_tunisia.services.AvisService;

import java.util.Optional;

@RestController
@RequestMapping("/api/destinations/{destinationId}/reviews")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class AvisController {

    private final AvisService avisService;

    /**
     * GET /api/destinations/{destinationId}/reviews
     * Public endpoint to fetch destination rating stats and review list
     */
    @GetMapping
    public ResponseEntity<AvisStatsDTO> getReviews(
            @PathVariable Integer destinationId,
            Authentication authentication) {
        log.info("[CONTROLLER] Récupération des avis pour la destination #{}", destinationId);
        AvisStatsDTO stats = avisService.getReviewsForDestination(destinationId, authentication);
        return ResponseEntity.ok(stats);
    }

    /**
     * POST /api/destinations/{destinationId}/reviews
     * Authenticated endpoint to submit or update a review
     */
    @PostMapping
    public ResponseEntity<AvisResponseDTO> submitReview(
            @PathVariable Integer destinationId,
            @Valid @RequestBody AvisRequestDTO dto,
            Authentication authentication) {
        log.info("[CONTROLLER] Soumission d'un avis pour la destination #{}", destinationId);
        AvisResponseDTO response = avisService.submitReview(destinationId, dto, authentication);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/destinations/{destinationId}/reviews/my-review
     * Get current user's review for a destination if submitted
     */
    @GetMapping("/my-review")
    public ResponseEntity<AvisResponseDTO> getMyReview(
            @PathVariable Integer destinationId,
            Authentication authentication) {
        Optional<AvisResponseDTO> myReview = avisService.getMyReview(destinationId, authentication);
        return myReview.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
