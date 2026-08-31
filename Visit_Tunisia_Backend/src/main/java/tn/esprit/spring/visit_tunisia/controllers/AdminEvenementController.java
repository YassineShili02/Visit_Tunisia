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
import tn.esprit.spring.visit_tunisia.DTO.admin.StatusPatchDTO;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementRequest;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementResponse;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.services.IAdminEvenementService;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/events")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class AdminEvenementController {

    private final IAdminEvenementService adminEvenementService;

    /**
     * POST /api/admin/events
     * Création manuelle d'un événement par l'admin.
     */
    @PostMapping
    public ResponseEntity<EvenementResponse> createEvenement(@Valid @RequestBody EvenementRequest request) {
        log.info("[CONTROLLER] Création manuelle d'un événement");
        EvenementResponse created = adminEvenementService.createEvenement(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * GET /api/admin/events?statut=ACTIF&genre=Musical&search=carthage&page=0&size=10
     * Liste paginée des événements avec filtres.
     */
    @GetMapping
    public ResponseEntity<Page<EvenementResponse>> getEvenements(
            @RequestParam(required = false) StatutPublication statut,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Integer destinationId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<EvenementResponse> result = adminEvenementService.getEvenements(statut, genre, destinationId, search, pageable);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/admin/events/{id}
     * Récupération d'un événement par ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<EvenementResponse> getEvenementById(@PathVariable Integer id) {
        EvenementResponse res = adminEvenementService.getEvenementById(id);
        return ResponseEntity.ok(res);
    }

    /**
     * PUT /api/admin/events/{id}
     * Mise à jour complète de l'événement.
     */
    @PutMapping("/{id}")
    public ResponseEntity<EvenementResponse> updateEvenement(
            @PathVariable Integer id,
            @Valid @RequestBody EvenementRequest request) {

        log.info("[CONTROLLER] Mise à jour complète de l'événement {}", id);
        EvenementResponse updated = adminEvenementService.updateEvenement(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * PATCH /api/admin/events/{id}/statut
     * Mise à jour du statut (ACTIF / BROUILLON / ARCHIVE).
     */
    @PatchMapping("/{id}/statut")
    public ResponseEntity<EvenementResponse> updateStatut(
            @PathVariable Integer id,
            @RequestBody StatusPatchDTO dto) {

        log.info("[CONTROLLER] Mise à jour statut événement {} → {}", id, dto.getStatut());
        EvenementResponse updated = adminEvenementService.updateStatut(id, dto.getStatut());
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/admin/events/{id}
     * Suppression d'un événement.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvenement(@PathVariable Integer id) {
        log.info("[CONTROLLER] Suppression événement {}", id);
        adminEvenementService.deleteEvenement(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/admin/events/bulk
     * Actions groupées (PUBLISH, DELETE).
     */
    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> bulkAction(@Valid @RequestBody BulkRequestDTO dto) {
        log.info("[CONTROLLER] Action groupée événements: {} sur {} éléments", dto.getAction(), dto.getIds().size());
        int count = adminEvenementService.bulkAction(dto);
        return ResponseEntity.ok(Map.of(
                "modifiedCount", count,
                "action", dto.getAction()
        ));
    }

    /**
     * GET /api/admin/events/counts
     * Compteurs réels par statut pour les onglets/sidebar.
     */
    @GetMapping("/counts")
    public ResponseEntity<CountsResponseDTO> getCounts() {
        CountsResponseDTO counts = adminEvenementService.getCounts();
        return ResponseEntity.ok(counts);
    }
}
