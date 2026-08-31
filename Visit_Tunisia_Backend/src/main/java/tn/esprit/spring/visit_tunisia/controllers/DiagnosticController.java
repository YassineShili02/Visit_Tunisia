package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.repositories.DestinationRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/diagnostic")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class DiagnosticController {

    private final DestinationRepository destinationRepository;

    @GetMapping("/db-status")
    public ResponseEntity<Map<String, Object>> getDatabaseStatus() {
        Map<String, Object> status = new HashMap<>();
        
        try {
            long totalDestinations = destinationRepository.count();
            long actifDestinations = destinationRepository.countByStatut(
                tn.esprit.spring.visit_tunisia.enums.StatutPublication.ACTIF
            );
            long brouillonDestinations = destinationRepository.countByStatut(
                tn.esprit.spring.visit_tunisia.enums.StatutPublication.BROUILLON
            );
            long archiveDestinations = destinationRepository.countByStatut(
                tn.esprit.spring.visit_tunisia.enums.StatutPublication.ARCHIVE
            );
            
            status.put("status", "connected");
            status.put("totalDestinations", totalDestinations);
            status.put("actifDestinations", actifDestinations);
            status.put("brouillonDestinations", brouillonDestinations);
            status.put("archiveDestinations", archiveDestinations);
            status.put("message", totalDestinations > 0 
                ? "Database contains " + totalDestinations + " destinations (" + actifDestinations + " ACTIF, " + brouillonDestinations + " BROUILLON, " + archiveDestinations + " ARCHIVE)" 
                : "Database is empty - no destinations found");
            
            log.info("✅ Database status check: {} total destinations ({} ACTIF, {} BROUILLON, {} ARCHIVE)", 
                totalDestinations, actifDestinations, brouillonDestinations, archiveDestinations);
            
        } catch (Exception e) {
            status.put("status", "error");
            status.put("message", "Failed to connect to database: " + e.getMessage());
            log.error("❌ Database connection failed", e);
        }
        
        return ResponseEntity.ok(status);
    }
    
    @GetMapping("/recent-updates")
    public ResponseEntity<Map<String, Object>> getRecentUpdates() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            var recentDestinations = destinationRepository.findAll(
                org.springframework.data.domain.PageRequest.of(0, 10,
                    org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "updatedAt"
                    )
                )
            );
            
            var destinationList = recentDestinations.getContent().stream()
                .map(dest -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", dest.getDestinationId());
                    item.put("nom", dest.getNom() != null && dest.getNom().containsKey("fr") 
                        ? dest.getNom().get("fr") 
                        : "Sans nom");
                    item.put("statut", dest.getStatut().name());
                    item.put("region", dest.getRegion());
                    item.put("updatedAt", dest.getUpdatedAt());
                    item.put("createdAt", dest.getCreatedAt());
                    return item;
                })
                .toList();
            
            response.put("status", "success");
            response.put("recentDestinations", destinationList);
            response.put("count", destinationList.size());
            
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Failed to fetch recent updates: " + e.getMessage());
            log.error("❌ Failed to fetch recent updates", e);
        }
        
        return ResponseEntity.ok(response);
    }
}
