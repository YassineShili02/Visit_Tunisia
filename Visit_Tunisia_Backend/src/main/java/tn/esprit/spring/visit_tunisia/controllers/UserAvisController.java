package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisResponseDTO;
import tn.esprit.spring.visit_tunisia.services.AvisService;

import java.util.List;

@RestController
@RequestMapping("/api/user/reviews")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class UserAvisController {

    private final AvisService avisService;

    /**
     * GET /api/user/reviews
     * Get all reviews submitted by current authenticated user
     */
    @GetMapping
    public ResponseEntity<List<AvisResponseDTO>> getMyReviews(Authentication authentication) {
        log.info("[USER_REVIEWS] Fetching all reviews for current user");
        List<AvisResponseDTO> reviews = avisService.getMyAllReviews(authentication);
        return ResponseEntity.ok(reviews);
    }
}
