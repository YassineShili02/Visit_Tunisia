package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.entities.Itineraire;
import tn.esprit.spring.visit_tunisia.services.ItineraireService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/itineraries")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class ItineraireController {

    private final ItineraireService itineraireService;

    @PostMapping
    public ResponseEntity<?> saveItinerary(@RequestBody Map<String, Object> payload) {
        log.info("[ItineraireController] POST /api/itineraries");
        try {
            Itineraire saved = itineraireService.saveItineraire(payload);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Itinéraire sauvegardé avec succès",
                    "itineraireId", saved.getItineraireId()
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("[ItineraireController] Erreur sauvegarde itinéraire: ", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyItineraries() {
        log.info("[ItineraireController] GET /api/itineraries/my");
        try {
            List<Itineraire> list = itineraireService.getMyItineraires();
            return ResponseEntity.ok(list);
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("[ItineraireController] Erreur récupération itinéraires: ", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteItinerary(@PathVariable Integer id) {
        log.info("[ItineraireController] DELETE /api/itineraries/{}", id);
        try {
            itineraireService.deleteItineraire(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Itinéraire supprimé"));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("[ItineraireController] Erreur suppression itinéraire: ", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
