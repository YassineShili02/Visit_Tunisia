package tn.esprit.spring.visit_tunisia.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.DTO.admin.BulkRequestDTO;
import tn.esprit.spring.visit_tunisia.DTO.admin.CountsResponseDTO;
import tn.esprit.spring.visit_tunisia.DTO.admin.ImportResponseDTO;
import tn.esprit.spring.visit_tunisia.DTO.admin.StatusPatchDTO;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationRequest;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationResponse;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.services.IAdminDestinationService;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/destinations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class AdminDestinationController {

    private final IAdminDestinationService adminDestinationService;
    private final tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository utilisateurRepository;

    // =========================================================================
    // POST /api/admin/destinations/import?gouvernorat={nom}
    // Launches the Python scraper asynchronously — returns 202 ACCEPTED immediately
    // =========================================================================
    @PostMapping("/import")
    public ResponseEntity<ImportResponseDTO> importDestinations(
            @RequestParam String gouvernorat,
            org.springframework.security.core.Authentication authentication) {

        log.info("[CONTROLLER] Import demandé pour le gouvernorat: {}", gouvernorat);

        tn.esprit.spring.visit_tunisia.entities.Utilisateur adminUser = null;
        if (authentication != null && authentication.isAuthenticated()) {
            adminUser = utilisateurRepository.findByEmail(authentication.getName()).orElse(null);
        }

        adminDestinationService.importDestinationsAsync(gouvernorat, adminUser);

        ImportResponseDTO response = ImportResponseDTO.builder()
                .status("PENDING")
                .message("Import de " + gouvernorat + " lancé. Les destinations apparaîtront dans l'onglet Brouillons sous peu.")
                .build();

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/import/status")
    public ResponseEntity<Map<String, Object>> getImportStatus(
            @RequestParam String gouvernorat) {

        Map<String, Object> status = adminDestinationService.getImportStatus(gouvernorat);
        return ResponseEntity.ok(status);
    }

    // =========================================================================
    // GET /api/admin/destinations?statut=BROUILLON&region=Nabeul&categorie=CULTUREL&search=musée&page=0&size=20
    // Returns a paginated list of destinations filtered by statut, region, categorie, search
    // =========================================================================
    @GetMapping
    public ResponseEntity<Page<DestinationResponse>> getDestinations(
            @RequestParam(required = false) StatutPublication statut,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) tn.esprit.spring.visit_tunisia.enums.Categorie categorie,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<DestinationResponse> result = adminDestinationService.getDestinations(statut, region, categorie, search, pageable);
        return ResponseEntity.ok(result);
    }

    // =========================================================================
    // PATCH /api/admin/destinations/{id}/statut
    // Body: { "statut": "ACTIF" }
    // Validates before publishing (ACTIF). Returns the updated destination.
    // =========================================================================
    @PatchMapping("/{id}/statut")
    public ResponseEntity<DestinationResponse> updateStatut(
            @PathVariable Integer id,
            @RequestBody StatusPatchDTO dto) {

        log.info("[CONTROLLER] Mise à jour statut destination {} → {}", id, dto.getStatut());
        DestinationResponse updated = adminDestinationService.updateStatut(id, dto.getStatut());
        return ResponseEntity.ok(updated);
    }

    // =========================================================================
    // DELETE /api/admin/destinations/{id}
    // Deletes a destination directly
    // =========================================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDestination(@PathVariable Integer id) {
        log.info("[CONTROLLER] Suppression destination {}", id);
        adminDestinationService.deleteDestination(id);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // PUT /api/admin/destinations/{id}
    // Full edit from the slide-over. Body: DestinationRequest JSON
    // =========================================================================
    @PutMapping("/{id}")
    public ResponseEntity<DestinationResponse> updateDestination(
            @PathVariable Integer id,
            @Valid @RequestBody DestinationRequest request) {

        log.info("[CONTROLLER] Édition complète de la destination {}", id);
        DestinationResponse updated = adminDestinationService.updateDestination(id, request);
        return ResponseEntity.ok(updated);
    }

    // =========================================================================
    // POST /api/admin/destinations/bulk
    // Body: { "ids": [101, 102, 103], "action": "PUBLISH" | "ARCHIVE" }
    // =========================================================================
    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> bulkAction(
            @Valid @RequestBody BulkRequestDTO dto) {

        log.info("[CONTROLLER] Action groupée: {} sur {} destinations", dto.getAction(), dto.getIds().size());
        int count = adminDestinationService.bulkAction(dto);

        return ResponseEntity.ok(Map.of(
                "modifiedCount", count,
                "action", dto.getAction()
        ));
    }

    // =========================================================================
    // GET /api/admin/destinations/counts
    // Returns totals by statut for sidebar badge
    // =========================================================================
    @GetMapping("/counts")
    public ResponseEntity<CountsResponseDTO> getCounts() {
        CountsResponseDTO counts = adminDestinationService.getCounts();
        return ResponseEntity.ok(counts);
    }
}
