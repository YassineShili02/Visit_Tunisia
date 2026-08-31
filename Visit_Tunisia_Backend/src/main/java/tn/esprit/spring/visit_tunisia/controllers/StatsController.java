package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.services.StatsService;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
public class StatsController {

    private final StatsService statsService;

    /**
     * Récupère les statistiques générales du dashboard
     */
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        return ResponseEntity.ok(statsService.getOverviewStats());
    }

    /**
     * Récupère la répartition des destinations par région
     */
    @GetMapping("/destinations-by-region")
    public ResponseEntity<Map<String, Long>> getDestinationsByRegion() {
        return ResponseEntity.ok(statsService.getDestinationsByRegion());
    }

    /**
     * Récupère la répartition des destinations par type
     */
    @GetMapping("/destinations-by-type")
    public ResponseEntity<Map<String, Long>> getDestinationsByType() {
        return ResponseEntity.ok(statsService.getDestinationsByType());
    }

    /**
     * Récupère les activités récentes
     */
    @GetMapping("/recent-activity")
    public ResponseEntity<Map<String, Object>> getRecentActivity() {
        return ResponseEntity.ok(statsService.getRecentActivity());
    }

    /**
     * Récupère les statistiques de fréquentation et de consultation
     */
    @GetMapping("/frequentation")
    public ResponseEntity<Map<String, Object>> getFrequentation(@RequestParam(defaultValue = "30D") String period) {
        return ResponseEntity.ok(statsService.getFrequentationStats(period));
    }
}
