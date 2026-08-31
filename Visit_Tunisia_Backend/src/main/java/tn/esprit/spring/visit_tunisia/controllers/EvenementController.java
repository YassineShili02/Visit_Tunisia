package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementResponse;
import tn.esprit.spring.visit_tunisia.entities.Evenement;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.exceptions.ValidationException;
import tn.esprit.spring.visit_tunisia.mappers.IEvenementMapper;
import tn.esprit.spring.visit_tunisia.repositories.EvenementRepository;
import tn.esprit.spring.visit_tunisia.services.ConsultationLogService;
import tn.esprit.spring.visit_tunisia.specifications.EvenementSpecifications;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class EvenementController {

    private final EvenementRepository evenementRepository;
    private final IEvenementMapper evenementMapper;
    private final tn.esprit.spring.visit_tunisia.services.IAdminEvenementService adminEvenementService;
    private final ConsultationLogService consultationLogService;

    /**
     * GET /api/events
     * Public endpoint to fetch published events (statut = ACTIF) for tourists.
     * Non-expired events only (dateFin >= today or dateDebut >= today), sorted by closest date first.
     */
    @GetMapping
    public ResponseEntity<Page<EvenementResponse>> getActiveEvents(
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Integer destinationId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "true") boolean upcomingOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        log.info("[PUBLIC] GET /api/events - page={}, size={}, genre={}, destinationId={}, upcomingOnly={}", page, size, genre, destinationId, upcomingOnly);
        adminEvenementService.archiveOrDraftExpiredEvents();
        Pageable pageable = PageRequest.of(page, size);

        java.time.LocalDate fromDate = upcomingOnly ? java.time.LocalDate.now() : null;

        Specification<Evenement> spec = EvenementSpecifications.withFilters(
                StatutPublication.ACTIF,
                genre,
                destinationId,
                search,
                fromDate,
                null
        );

        Page<EvenementResponse> result = evenementRepository.findAll(spec, pageable)
                .map(evenementMapper::toResponse);

        // Log la recherche si un terme est fourni (utilisateurs connectés uniquement)
        if (search != null && !search.isBlank()) {
            consultationLogService.logRecherche(search.trim(), consultationLogService.resolveCurrentUser());
        }

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/events/{id}
     * Public endpoint to fetch a single event by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<EvenementResponse> getEventById(@PathVariable Integer id) {
        log.info("[PUBLIC] GET /api/events/{}", id);
        adminEvenementService.archiveOrDraftExpiredEvents();

        Evenement ev = evenementRepository.findById(id)
                .filter(e -> e.getStatut() == StatutPublication.ACTIF)
                .orElseThrow(() -> new ValidationException("Événement introuvable (#" + id + ")"));

        java.time.LocalDate today = java.time.LocalDate.now();
        boolean isExpired = (ev.getDateFin() != null && ev.getDateFin().isBefore(today)) ||
                (ev.getDateFin() == null && ev.getDateDebut() != null && ev.getDateDebut().isBefore(today));
        if (isExpired) {
            ev.setStatut(StatutPublication.BROUILLON);
            evenementRepository.save(ev);
            throw new ValidationException("Cet événement est terminé et n'est plus disponible.");
        }

        // Enregistrement asynchrone (utilisateur résolu dans le thread HTTP principal)
        consultationLogService.logVueEvenement(ev, consultationLogService.resolveCurrentUser());

        return ResponseEntity.ok(evenementMapper.toResponse(ev));
    }
}
