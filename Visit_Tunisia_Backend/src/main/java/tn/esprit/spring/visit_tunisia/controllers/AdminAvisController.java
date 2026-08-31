package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.entities.Avis;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.enums.StatutModeration;
import tn.esprit.spring.visit_tunisia.repositories.AvisRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class AdminAvisController {

    private final AvisRepository avisRepository;
    private final tn.esprit.spring.visit_tunisia.services.SentimentAnalysisService sentimentAnalysisService;
    private final tn.esprit.spring.visit_tunisia.services.JournalActionService journalActionService;
    private final tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository utilisateurRepository;

    private tn.esprit.spring.visit_tunisia.entities.Utilisateur getCurrentAdminUser() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                return utilisateurRepository.findByEmail(auth.getName()).orElse(null);
            }
        } catch (Exception ignored) {}
        return null;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllReviews(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String sentiment,
            @RequestParam(required = false) Integer minNote,
            @RequestParam(required = false) Integer maxNote,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String destinationSearch,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "dateCreation,desc") String sort
    ) {
        log.info("[ADMIN] Get reviews - statut: {}, sentiment: {}, minNote: {}, maxNote: {}, search: {}, destinationSearch: {}, page: {}, size: {}",
                statut, sentiment, minNote, maxNote, search, destinationSearch, page, size);
        
        try {
            // Parse sort parameter
            String[] sortParams = sort.split(",");
            String sortField = sortParams[0];
            String sortDirection = sortParams.length > 1 ? sortParams[1] : "desc";
            
            Sort sortObj = sortDirection.equalsIgnoreCase("asc") 
                ? Sort.by(sortField).ascending() 
                : Sort.by(sortField).descending();
            
            Pageable pageable = PageRequest.of(page, size, sortObj);
            
            // Get all reviews with filters
            List<Avis> allReviews = avisRepository.findAll();
            
            log.info("[ADMIN] Total reviews before filtering: {}", allReviews.size());
            
            // Apply filters
            List<Avis> filteredReviews = allReviews;
            
            // Filter by status
            if (statut != null && !statut.equalsIgnoreCase("Tous")) {
                log.info("[ADMIN] >>> STATUT FILTER ACTIVATED <<<");
                log.info("[ADMIN] Received statut param: '{}'", statut);
                log.info("[ADMIN] Size BEFORE statut filter: {}", filteredReviews.size());
                
                try {
                    StatutModeration targetStatut = StatutModeration.valueOf(statut.toUpperCase());
                    log.info("[ADMIN] Parsed target StatutModeration: {}", targetStatut);
                    
                    // Log a few examples before filtering
                    filteredReviews.stream().limit(3).forEach(a -> {
                        log.info("[ADMIN] Sample review before filter - ID: {}, Statut: {}", 
                                a.getAvisId(), a.getStatutModeration());
                    });
                    
                    filteredReviews = filteredReviews.stream()
                        .filter(a -> {
                            boolean match = a.getStatutModeration() == targetStatut;
                            if (!match) {
                                log.debug("[ADMIN] Review {} filtered out: {} != {}", 
                                         a.getAvisId(), a.getStatutModeration(), targetStatut);
                            }
                            return match;
                        })
                        .collect(Collectors.toList());
                    
                    log.info("[ADMIN] Size AFTER statut filter: {}", filteredReviews.size());
                    
                    // Log a few examples after filtering
                    filteredReviews.stream().limit(3).forEach(a -> {
                        log.info("[ADMIN] Sample review after filter - ID: {}, Statut: {}", 
                                a.getAvisId(), a.getStatutModeration());
                    });
                } catch (IllegalArgumentException e) {
                    log.error("[ADMIN] Invalid statut parameter: '{}' - Exception: {}", statut, e.getMessage());
                }
            } else {
                log.info("[ADMIN] Statut filter SKIPPED (statut is null or 'Tous'): '{}'", statut);
            }
            
            // Filter by sentiment
            if (sentiment != null && !sentiment.equalsIgnoreCase("Tous")) {
                log.info("[ADMIN] >>> SENTIMENT FILTER ACTIVATED <<<");
                log.info("[ADMIN] Received sentiment param: '{}'", sentiment);
                log.info("[ADMIN] Size BEFORE sentiment filter: {}", filteredReviews.size());
                
                String targetSentiment = sentiment.toUpperCase();
                filteredReviews = filteredReviews.stream()
                    .filter(a -> {
                        boolean match = a.getSentimentLabel() != null && 
                                       a.getSentimentLabel().equalsIgnoreCase(targetSentiment);
                        return match;
                    })
                    .collect(Collectors.toList());
                
                log.info("[ADMIN] Size AFTER sentiment filter: {}", filteredReviews.size());
            } else {
                log.info("[ADMIN] Sentiment filter SKIPPED (sentiment is null or 'Tous'): '{}'", sentiment);
            }
            
            // Filter by note range
            if (minNote != null) {
                filteredReviews = filteredReviews.stream()
                    .filter(a -> a.getNote() >= minNote)
                    .collect(Collectors.toList());
                log.info("[ADMIN] After minNote filter: {} reviews", filteredReviews.size());
            }
            if (maxNote != null) {
                filteredReviews = filteredReviews.stream()
                    .filter(a -> a.getNote() <= maxNote)
                    .collect(Collectors.toList());
                log.info("[ADMIN] After maxNote filter: {} reviews", filteredReviews.size());
            }
            
            // Filter by search (in commentaire, author name, destination name)
            if (search != null && !search.isBlank()) {
                String searchLower = search.toLowerCase();
                filteredReviews = filteredReviews.stream()
                    .filter(a -> {
                        boolean matchCommentaire = a.getCommentaire() != null && 
                                                  a.getCommentaire().toLowerCase().contains(searchLower);
                        
                        boolean matchAuthor = false;
                        if (a.getUtilisateur() != null) {
                            String fullName = (a.getUtilisateur().getPrenom() + " " + a.getUtilisateur().getNom()).toLowerCase();
                            String email = a.getUtilisateur().getEmail() != null ? a.getUtilisateur().getEmail().toLowerCase() : "";
                            matchAuthor = fullName.contains(searchLower) || email.contains(searchLower);
                        }
                        
                        boolean matchDestination = false;
                        if (a.getDestination() != null && a.getDestination().getNom() != null) {
                            Map<String, String> nomMap = a.getDestination().getNom();
                            String nomFr = nomMap.getOrDefault("fr", "");
                            String nomEn = nomMap.getOrDefault("en", "");
                            String nomAr = nomMap.getOrDefault("ar", "");
                            matchDestination = nomFr.toLowerCase().contains(searchLower) ||
                                             nomEn.toLowerCase().contains(searchLower) ||
                                             nomAr.toLowerCase().contains(searchLower);
                        }
                        
                        return matchCommentaire || matchAuthor || matchDestination;
                    })
                    .collect(Collectors.toList());
                log.info("[ADMIN] After search filter: {} reviews", filteredReviews.size());
            }
            
            // Filter by destination name (destinationSearch parameter)
            if (destinationSearch != null && !destinationSearch.isBlank()) {
                log.info("[ADMIN] >>> DESTINATION SEARCH FILTER ACTIVATED <<<");
                log.info("[ADMIN] Searching for destination: '{}'", destinationSearch);
                log.info("[ADMIN] Size BEFORE destination filter: {}", filteredReviews.size());
                
                String destSearchLower = destinationSearch.toLowerCase();
                filteredReviews = filteredReviews.stream()
                    .filter(a -> {
                        if (a.getDestination() != null && a.getDestination().getNom() != null) {
                            Map<String, String> nomMap = a.getDestination().getNom();
                            String nomFr = nomMap.getOrDefault("fr", "").toLowerCase();
                            String nomEn = nomMap.getOrDefault("en", "").toLowerCase();
                            String nomAr = nomMap.getOrDefault("ar", "").toLowerCase();
                            return nomFr.contains(destSearchLower) ||
                                   nomEn.contains(destSearchLower) ||
                                   nomAr.contains(destSearchLower);
                        }
                        return false;
                    })
                    .collect(Collectors.toList());
                
                log.info("[ADMIN] Size AFTER destination filter: {}", filteredReviews.size());
            }
            
            // Filter by date range
            if (dateFrom != null && !dateFrom.isBlank()) {
                try {
                    LocalDateTime fromDate = LocalDate.parse(dateFrom).atStartOfDay();
                    filteredReviews = filteredReviews.stream()
                        .filter(a -> a.getDateCreation().isAfter(fromDate) || 
                                   a.getDateCreation().isEqual(fromDate))
                        .collect(Collectors.toList());
                    log.info("[ADMIN] After dateFrom filter: {} reviews", filteredReviews.size());
                } catch (Exception e) {
                    log.warn("[ADMIN] Invalid dateFrom parameter: {}", dateFrom);
                }
            }
            if (dateTo != null && !dateTo.isBlank()) {
                try {
                    LocalDateTime toDate = LocalDate.parse(dateTo).atTime(23, 59, 59);
                    filteredReviews = filteredReviews.stream()
                        .filter(a -> a.getDateCreation().isBefore(toDate) || 
                                   a.getDateCreation().isEqual(toDate))
                        .collect(Collectors.toList());
                    log.info("[ADMIN] After dateTo filter: {} reviews", filteredReviews.size());
                } catch (Exception e) {
                    log.warn("[ADMIN] Invalid dateTo parameter: {}", dateTo);
                }
            }
            
            // Apply sorting
            if (sortField.equals("dateCreation")) {
                filteredReviews.sort((a1, a2) -> sortDirection.equalsIgnoreCase("asc") 
                    ? a1.getDateCreation().compareTo(a2.getDateCreation())
                    : a2.getDateCreation().compareTo(a1.getDateCreation()));
            } else if (sortField.equals("note")) {
                filteredReviews.sort((a1, a2) -> sortDirection.equalsIgnoreCase("asc")
                    ? Integer.compare(a1.getNote(), a2.getNote())
                    : Integer.compare(a2.getNote(), a1.getNote()));
            }
            
            // Apply pagination
            int start = page * size;
            int end = Math.min(start + size, filteredReviews.size());
            List<Avis> pageContent = filteredReviews.subList(Math.min(start, filteredReviews.size()), end);
            
            // Convert to DTOs
            List<Map<String, Object>> reviewDTOs = pageContent.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
            
            int totalElements = filteredReviews.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", reviewDTOs);
            response.put("totalElements", totalElements);
            response.put("totalPages", totalPages);
            response.put("size", size);
            response.put("number", page);
            
            log.info("[ADMIN] Returning {} reviews out of {} total (page {}/{})", 
                    reviewDTOs.size(), totalElements, page + 1, totalPages);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("[ADMIN] Error loading reviews", e);
            throw e;
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getReviewStats() {
        try {
            long total = avisRepository.count();
            
            long enAttente = 0;
            long approuves = 0;
            long rejetes = 0;
            
            List<Avis> allReviews = avisRepository.findAll();
            
            for (Avis a : allReviews) {
                if (a.getStatutModeration() == StatutModeration.EN_ATTENTE) {
                    enAttente++;
                } else if (a.getStatutModeration() == StatutModeration.VALIDE) {
                    approuves++;
                } else if (a.getStatutModeration() == StatutModeration.MASQUE) {
                    rejetes++;
                }
            }
            
            // Calculate average rating
            double avgRating = allReviews.stream()
                .mapToInt(Avis::getNote)
                .average()
                .orElse(0.0);
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalReviews", total);
            stats.put("enAttente", enAttente);
            stats.put("approuves", approuves);
            stats.put("rejetes", rejetes);
            stats.put("averageRating", avgRating);
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("[ADMIN] Error getting review stats", e);
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalReviews", 0);
            stats.put("enAttente", 0);
            stats.put("approuves", 0);
            stats.put("rejetes", 0);
            stats.put("averageRating", 0.0);
            return ResponseEntity.ok(stats);
        }
    }

    @PatchMapping("/{id}/moderation")
    public ResponseEntity<?> updateModerationStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> payload
    ) {
        String statutStr = payload.get("statut");
        log.info("[ADMIN] Update review {} moderation status to {}", id, statutStr);
        
        Avis review = avisRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Avis introuvable (ID: " + id + ")"));
        
        StatutModeration newStatut = StatutModeration.valueOf(statutStr.toUpperCase());
        
        // If trying to activate (VALIDE) a masked review, check if user already has an active review
        if (newStatut == StatutModeration.VALIDE && review.getStatutModeration() == StatutModeration.MASQUE) {
            Integer utilisateurId = review.getUtilisateur().getUtilisateurId();
            Integer destinationId = review.getDestination() != null ? review.getDestination().getDestinationId() : null;
            
            if (destinationId != null) {
                // Check if this user already has an active review for this destination
                Optional<Avis> existingActive = avisRepository.findActiveByUtilisateurIdAndDestinationId(utilisateurId, destinationId);
                
                if (existingActive.isPresent() && !existingActive.get().getAvisId().equals(id)) {
                    // Another active review exists for this user/destination
                    log.warn("[ADMIN] Cannot activate review {}: user {} already has an active review (ID: {}) for destination {}",
                            id, utilisateurId, existingActive.get().getAvisId(), destinationId);
                    
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "DUPLICATE_ACTIVE_REVIEW");
                    error.put("message", "Impossible de publier cet avis car l'utilisateur a déjà un avis publié pour cette destination (ID: " + existingActive.get().getAvisId() + ")");
                    return ResponseEntity.badRequest().body(error);
                }
            }
        }
        
        review.setStatutModeration(newStatut);
        avisRepository.save(review);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.MODERATION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.AVIS,
                "Avis #" + id + " " + (newStatut == StatutModeration.VALIDE ? "validé (visible)" : "masqué (modération)"),
                getCurrentAdminUser()
        );
        
        return ResponseEntity.ok(convertToDTO(review));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(@PathVariable Integer id) {
        log.info("[ADMIN] Delete review {}", id);
        
        Avis review = avisRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Avis introuvable (ID: " + id + ")"));
        
        avisRepository.delete(review);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.SUPPRESSION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.AVIS,
                "Avis #" + id + " supprimé par un administrateur",
                getCurrentAdminUser()
        );
        
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-moderation")
    public ResponseEntity<?> bulkModeration(@RequestBody Map<String, Object> payload) {
        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) payload.get("ids");
        String statutStr = (String) payload.get("statut");
        
        log.info("[ADMIN] Bulk moderation: {} reviews to {}", ids.size(), statutStr);
        
        StatutModeration newStatut = StatutModeration.valueOf(statutStr.toUpperCase());
        
        int skipped = 0;
        List<String> errors = new ArrayList<>();
        
        for (Integer id : ids) {
            Optional<Avis> reviewOpt = avisRepository.findById(id);
            if (reviewOpt.isPresent()) {
                Avis review = reviewOpt.get();
                
                // If trying to activate a masked review, check for duplicates
                if (newStatut == StatutModeration.VALIDE && review.getStatutModeration() == StatutModeration.MASQUE) {
                    Integer utilisateurId = review.getUtilisateur().getUtilisateurId();
                    Integer destinationId = review.getDestination() != null ? review.getDestination().getDestinationId() : null;
                    
                    if (destinationId != null) {
                        Optional<Avis> existingActive = avisRepository.findActiveByUtilisateurIdAndDestinationId(utilisateurId, destinationId);
                        
                        if (existingActive.isPresent() && !existingActive.get().getAvisId().equals(id)) {
                            skipped++;
                            errors.add("Avis #" + id + " ignoré : l'utilisateur a déjà un avis actif (ID: " + existingActive.get().getAvisId() + ")");
                            log.warn("[ADMIN] Skipped review {} in bulk operation: duplicate active review exists", id);
                            continue;
                        }
                    }
                }
                
                review.setStatutModeration(newStatut);
                avisRepository.save(review);

                journalActionService.enregistrer(
                        tn.esprit.spring.visit_tunisia.enums.TypeAction.MODERATION,
                        tn.esprit.spring.visit_tunisia.enums.EntiteType.AVIS,
                        "Avis #" + id + " " + (newStatut == StatutModeration.VALIDE ? "validé" : "masqué") + " (action groupée)",
                        getCurrentAdminUser()
                );
            }
        }
        
        if (skipped > 0) {
            Map<String, Object> response = new HashMap<>();
            response.put("processed", ids.size() - skipped);
            response.put("skipped", skipped);
            response.put("errors", errors);
            return ResponseEntity.status(207).body(response); // 207 Multi-Status
        }
        
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk-delete")
    public ResponseEntity<Void> bulkDelete(@RequestBody Map<String, Object> payload) {
        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) payload.get("ids");
        
        log.info("[ADMIN] Bulk delete: {} reviews", ids.size());
        
        for (Integer id : ids) {
            avisRepository.deleteById(id);
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.SUPPRESSION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.AVIS,
                    "Avis #" + id + " supprimé (action groupée)",
                    getCurrentAdminUser()
            );
        }
        
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/retry-sentiment")
    public ResponseEntity<Map<String, Object>> retrySentimentAnalysis() {
        log.info("[ADMIN] Manual retry of sentiment analysis requested");
        
        try {
            // Find all reviews with null sentiment that have a comment
            List<Avis> reviewsToRetry = avisRepository.findAll().stream()
                .filter(a -> a.getSentimentLabel() == null)
                .filter(a -> a.getCommentaire() != null && !a.getCommentaire().isBlank())
                .collect(Collectors.toList());
            
            if (reviewsToRetry.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("message", "Aucun avis à analyser");
                response.put("retried", 0);
                log.info("[ADMIN] No reviews to retry");
                return ResponseEntity.ok(response);
            }
            
            log.info("[ADMIN] Found {} reviews to retry sentiment analysis", reviewsToRetry.size());
            
            // Trigger async analysis for each review
            for (Avis avis : reviewsToRetry) {
                log.info("[ADMIN] Triggering sentiment analysis for review #{}: '{}'", 
                        avis.getAvisId(), 
                        avis.getCommentaire().substring(0, Math.min(50, avis.getCommentaire().length())));
                sentimentAnalysisService.analyzeSentimentAsync(avis.getAvisId());
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Analyse de sentiment lancée pour " + reviewsToRetry.size() + " avis. Les résultats apparaîtront dans quelques secondes.");
            response.put("retried", reviewsToRetry.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("[ADMIN] Error during manual sentiment retry", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erreur lors du lancement de l'analyse");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    private Map<String, Object> convertToDTO(Avis avis) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("avisId", avis.getAvisId());
        dto.put("note", avis.getNote());
        dto.put("commentaire", avis.getCommentaire());
        dto.put("sentimentLabel", avis.getSentimentLabel());
        dto.put("sentimentScore", avis.getSentimentScore());
        dto.put("statutModeration", avis.getStatutModeration().name());
        dto.put("dateCreation", avis.getDateCreation());
        
        // User info
        try {
            if (avis.getUtilisateur() != null) {
                Map<String, Object> user = new HashMap<>();
                user.put("nom", avis.getUtilisateur().getNom());
                user.put("prenom", avis.getUtilisateur().getPrenom());
                user.put("email", avis.getUtilisateur().getEmail());
                dto.put("utilisateur", user);
                log.info("[ADMIN] User found: {} {}", avis.getUtilisateur().getPrenom(), avis.getUtilisateur().getNom());
            } else {
                log.warn("[ADMIN] No user for review {}", avis.getAvisId());
            }
        } catch (Exception e) {
            log.error("[ADMIN] Error loading user for review {}", avis.getAvisId(), e);
        }
        
        // Destination info
        try {
            if (avis.getDestination() != null) {
                Map<String, Object> dest = new HashMap<>();
                Destination destination = avis.getDestination();
                
                // Le nom est une Map multilingue, on prend le français
                Map<String, String> nomMap = destination.getNom();
                String nomDest = nomMap != null ? 
                    (nomMap.getOrDefault("fr", nomMap.getOrDefault("en", nomMap.getOrDefault("ar", "N/A")))) : 
                    "N/A";
                
                // Calculate note moyenne for this destination (only VALIDE reviews)
                Double noteAverage = avisRepository.averageRatingByDestinationIdAndStatut(
                    destination.getDestinationId(), 
                    StatutModeration.VALIDE
                );
                    
                dest.put("nom", nomMap); // Send the full map to frontend
                dest.put("destinationId", destination.getDestinationId());
                dest.put("noteAverage", noteAverage); // Add average rating
                dto.put("destination", dest);
                log.info("[ADMIN] Destination found: {} (note: {})", nomDest, noteAverage);
            } else {
                log.warn("[ADMIN] No destination for review {}", avis.getAvisId());
            }
        } catch (Exception e) {
            log.error("[ADMIN] Error loading destination for review {}", avis.getAvisId(), e);
        }
        
        // Event info
        try {
            if (avis.getEvenement() != null) {
                Map<String, Object> event = new HashMap<>();
                // Le nom est une Map multilingue, on prend le français
                Map<String, String> nomMap = avis.getEvenement().getNom();
                String nomEvent = nomMap != null ? 
                    (nomMap.getOrDefault("fr", nomMap.getOrDefault("en", nomMap.getOrDefault("ar", "N/A")))) : 
                    "N/A";
                    
                event.put("nom", nomMap); // Send the full map to frontend
                event.put("evenementId", avis.getEvenement().getEvenementId());
                dto.put("evenement", event);
                log.info("[ADMIN] Event found: {}", nomEvent);
            } else {
                log.warn("[ADMIN] No event for review {}", avis.getAvisId());
            }
        } catch (Exception e) {
            log.error("[ADMIN] Error loading event for review {}", avis.getAvisId(), e);
        }
        
        return dto;
    }
}
