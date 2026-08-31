package tn.esprit.spring.visit_tunisia.controllers;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.DTO.journalAction.JournalActionResponse;
import tn.esprit.spring.visit_tunisia.entities.JournalAction;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.EntiteType;
import tn.esprit.spring.visit_tunisia.enums.TypeAction;
import tn.esprit.spring.visit_tunisia.repositories.JournalActionRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/admin/journal")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class AdminJournalController {

    private final JournalActionRepository journalActionRepository;

    @GetMapping
    public ResponseEntity<Page<JournalActionResponse>> getJournal(
            @RequestParam(required = false) String typeAction,
            @RequestParam(required = false) String entiteType,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "dateAction") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        log.info("[ADMIN JOURNAL] GET /api/admin/journal - page={}, size={}, action={}, entite={}, from={}, to={}",
                page, size, typeAction, entiteType, dateFrom, dateTo);

        Sort sort = sortDir.equalsIgnoreCase("ASC")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<JournalAction> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter TypeAction
            if (typeAction != null && !typeAction.isBlank() && !"Tous".equalsIgnoreCase(typeAction)) {
                try {
                    TypeAction actionEnum = TypeAction.valueOf(typeAction.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("typeAction"), actionEnum));
                } catch (IllegalArgumentException ignored) {}
            }

            // Filter EntiteType
            if (entiteType != null && !entiteType.isBlank() && !"Tous".equalsIgnoreCase(entiteType)) {
                try {
                    EntiteType entiteEnum = EntiteType.valueOf(entiteType.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("entiteType"), entiteEnum));
                } catch (IllegalArgumentException ignored) {}
            }

            // Filter dateFrom
            if (dateFrom != null && !dateFrom.isBlank()) {
                try {
                    LocalDate from = LocalDate.parse(dateFrom.trim());
                    LocalDateTime fromDateTime = from.atStartOfDay();
                    predicates.add(cb.greaterThanOrEqualTo(root.get("dateAction"), fromDateTime));
                } catch (Exception ignored) {}
            }

            // Filter dateTo
            if (dateTo != null && !dateTo.isBlank()) {
                try {
                    LocalDate to = LocalDate.parse(dateTo.trim());
                    LocalDateTime toDateTime = to.atTime(LocalTime.MAX);
                    predicates.add(cb.lessThanOrEqualTo(root.get("dateAction"), toDateTime));
                } catch (Exception ignored) {}
            }

            // Filter search (details or user name / email)
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase().trim() + "%";
                var userJoin = root.join("utilisateur");
                Predicate detailsLike = cb.like(cb.lower(root.get("details")), pattern);
                Predicate userEmailLike = cb.like(cb.lower(userJoin.get("email")), pattern);
                Predicate userNomLike = cb.like(cb.lower(userJoin.get("nom")), pattern);
                Predicate userPrenomLike = cb.like(cb.lower(userJoin.get("prenom")), pattern);
                predicates.add(cb.or(detailsLike, userEmailLike, userNomLike, userPrenomLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<JournalActionResponse> result = journalActionRepository.findAll(spec, pageable)
                .map(this::mapToResponse);

        return ResponseEntity.ok(result);
    }

    private JournalActionResponse mapToResponse(JournalAction j) {
        Utilisateur user = j.getUtilisateur();
        String userNom = "Utilisateur inconnu";
        String userEmail = "";
        var userRole = (user != null) ? user.getRole() : null;
        Integer userId = null;

        if (user != null) {
            userId = user.getUtilisateurId();
            userEmail = user.getEmail();
            if (user.getPrenom() != null || user.getNom() != null) {
                userNom = ((user.getPrenom() != null ? user.getPrenom() : "") + " " +
                           (user.getNom() != null ? user.getNom() : "")).trim();
            } else {
                userNom = user.getEmail();
            }
        }

        return JournalActionResponse.builder()
                .journalId(j.getJournalId())
                .typeAction(j.getTypeAction())
                .entiteType(j.getEntiteType())
                .details(j.getDetails())
                .dateAction(j.getDateAction())
                .utilisateurId(userId)
                .utilisateurNom(userNom)
                .utilisateurEmail(userEmail)
                .utilisateurRole(userRole)
                .build();
    }
}
