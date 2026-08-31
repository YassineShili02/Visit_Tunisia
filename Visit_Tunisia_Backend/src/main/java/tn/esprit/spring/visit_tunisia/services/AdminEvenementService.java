package tn.esprit.spring.visit_tunisia.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.spring.visit_tunisia.DTO.admin.BulkRequestDTO;
import tn.esprit.spring.visit_tunisia.DTO.admin.CountsResponseDTO;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementRequest;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementResponse;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.entities.Evenement;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.exceptions.DestinationNotFoundException;
import tn.esprit.spring.visit_tunisia.exceptions.ValidationException;
import tn.esprit.spring.visit_tunisia.mappers.IEvenementMapper;
import tn.esprit.spring.visit_tunisia.repositories.DestinationRepository;
import tn.esprit.spring.visit_tunisia.repositories.EvenementRepository;
import tn.esprit.spring.visit_tunisia.specifications.EvenementSpecifications;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminEvenementService implements IAdminEvenementService {

    private final EvenementRepository evenementRepository;
    private final DestinationRepository destinationRepository;
    private final IEvenementMapper evenementMapper;
    private final JournalActionService journalActionService;
    private final tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository utilisateurRepository;

    private Utilisateur getCurrentAdminUser() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                return utilisateurRepository.findByEmail(auth.getName()).orElse(null);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String getEvenementNom(Evenement ev) {
        if (ev == null || ev.getNom() == null) return "Sans titre";
        Map<String, String> nom = ev.getNom();
        return nom.getOrDefault("fr", nom.getOrDefault("en", nom.getOrDefault("ar", "Événement")));
    }

    @Override
    @Transactional
    public EvenementResponse createEvenement(EvenementRequest request) {
        log.info("[ADMIN EVENT] Création d'un nouvel événement");
        validateRequest(request);

        Evenement evenement = evenementMapper.toEntity(request);
        evenement.setLieuLibre(request.getLieuLibre());

        // Rattacher la destination catalogue si fournie
        if (request.getDestinationId() != null && request.getDestinationId() > 0) {
            Destination destination = destinationRepository.findById(request.getDestinationId())
                    .orElseThrow(() -> new DestinationNotFoundException("Destination introuvable (#" + request.getDestinationId() + ")"));
            if (destination.getStatut() != StatutPublication.ACTIF) {
                throw new ValidationException("Impossible de rattacher un événement à une destination non active (" + destination.getStatut() + ").");
            }
            evenement.setDestination(destination);
        }

        if (evenement.getStatut() == null) {
            evenement.setStatut(StatutPublication.ACTIF);
        }

        if (evenement.getStatut() == StatutPublication.ACTIF) {
            validateForPublication(evenement);
        }

        Evenement saved = evenementRepository.save(evenement);
        log.info("[ADMIN EVENT] Événement créé avec succès (ID: {}, Statut: {})", saved.getEvenementId(), saved.getStatut());

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.CREATION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.EVENEMENT,
                "Événement '" + getEvenementNom(saved) + "' (#" + saved.getEvenementId() + ") créé",
                getCurrentAdminUser()
        );

        return evenementMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public Page<EvenementResponse> getEvenements(StatutPublication statut, String genre, Integer destinationId, String search, Pageable pageable) {
        archiveOrDraftExpiredEvents();
        String cleanGenre = (genre != null && !genre.trim().isEmpty() && !"Tous".equalsIgnoreCase(genre)) ? genre.trim() : null;
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        Specification<Evenement> spec = EvenementSpecifications.withFilters(statut, cleanGenre, destinationId, cleanSearch);
        Page<Evenement> page = evenementRepository.findAll(spec, pageable);
        return page.map(evenementMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public EvenementResponse getEvenementById(Integer id) {
        Evenement ev = evenementRepository.findById(id)
                .orElseThrow(() -> new ValidationException("Événement introuvable (ID: " + id + ")"));
        return evenementMapper.toResponse(ev);
    }

    @Override
    @Transactional
    public EvenementResponse updateEvenement(Integer id, EvenementRequest request) {
        log.info("[ADMIN EVENT] Mise à jour de l'événement {}", id);
        validateRequest(request);

        Evenement evenement = evenementRepository.findById(id)
                .orElseThrow(() -> new ValidationException("Événement introuvable (ID: " + id + ")"));

        evenement.setLieuLibre(request.getLieuLibre());

        // Rattacher/changer la destination si fournie
        if (request.getDestinationId() != null && request.getDestinationId() > 0) {
            boolean sameDestination = evenement.getDestination() != null &&
                    evenement.getDestination().getDestinationId().equals(request.getDestinationId());
            if (!sameDestination) {
                Destination destination = destinationRepository.findById(request.getDestinationId())
                        .orElseThrow(() -> new DestinationNotFoundException("Destination introuvable (#" + request.getDestinationId() + ")"));
                if (destination.getStatut() != StatutPublication.ACTIF) {
                    throw new ValidationException("Impossible de rattacher un événement à une destination non active (" + destination.getStatut() + ").");
                }
                evenement.setDestination(destination);
            }
        } else {
            // Pas de destination catalogue → effacer le lien
            evenement.setDestination(null);
        }

        evenementMapper.updateEntityFromRequest(request, evenement);

        if (evenement.getStatut() == StatutPublication.ACTIF) {
            validateForPublication(evenement);
        }

        Evenement saved = evenementRepository.save(evenement);
        return evenementMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public EvenementResponse updateStatut(Integer id, StatutPublication newStatut) {
        log.info("[ADMIN EVENT] Mise à jour statut événement {} → {}", id, newStatut);
        Evenement ev = evenementRepository.findById(id)
                .orElseThrow(() -> new ValidationException("Événement introuvable (ID: " + id + ")"));

        if (newStatut == StatutPublication.ACTIF) {
            validateForPublication(ev);
        }

        ev.setStatut(newStatut);
        Evenement saved = evenementRepository.save(ev);

        String evNom = getEvenementNom(saved);
        Utilisateur admin = getCurrentAdminUser();
        if (newStatut == StatutPublication.ACTIF) {
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.MODERATION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.EVENEMENT,
                    "Événement '" + evNom + "' (#" + id + ") publié",
                    admin
            );
        } else if (newStatut == StatutPublication.ARCHIVE) {
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.SUPPRESSION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.EVENEMENT,
                    "Événement '" + evNom + "' (#" + id + ") archivé",
                    admin
            );
        } else {
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.EVENEMENT,
                    "Événement '" + evNom + "' (#" + id + ") passé au statut " + newStatut,
                    admin
            );
        }

        return evenementMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteEvenement(Integer id) {
        log.info("[ADMIN EVENT] Suppression événement {}", id);
        Evenement ev = evenementRepository.findById(id)
                .orElseThrow(() -> new ValidationException("Événement introuvable (ID: " + id + ")"));
        String evNom = getEvenementNom(ev);
        evenementRepository.delete(ev);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.SUPPRESSION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.EVENEMENT,
                "Événement '" + evNom + "' (#" + id + ") supprimé",
                getCurrentAdminUser()
        );
    }

    @Override
    @Transactional
    public int bulkAction(BulkRequestDTO dto) {
        Utilisateur admin = getCurrentAdminUser();

        if ("DELETE".equalsIgnoreCase(dto.getAction())) {
            List<Evenement> events = evenementRepository.findAllByEvenementIdIn(dto.getIds());
            for (Evenement ev : events) {
                journalActionService.enregistrer(
                        tn.esprit.spring.visit_tunisia.enums.TypeAction.SUPPRESSION,
                        tn.esprit.spring.visit_tunisia.enums.EntiteType.EVENEMENT,
                        "Événement '" + getEvenementNom(ev) + "' (#" + ev.getEvenementId() + ") supprimé (action groupée)",
                        admin
                );
            }
            evenementRepository.deleteAll(events);
            log.info("[ADMIN EVENT BULK DELETE] {} événements supprimés", events.size());
            return events.size();
        }

        StatutPublication targetStatut;
        if ("PUBLISH".equalsIgnoreCase(dto.getAction())) {
            targetStatut = StatutPublication.ACTIF;
        } else {
            throw new ValidationException("Action inconnue: " + dto.getAction() + ". Utilisez PUBLISH ou DELETE.");
        }

        List<Evenement> events = evenementRepository.findAllByEvenementIdIn(dto.getIds());
        if (events.size() != dto.getIds().size()) {
            throw new ValidationException("Un ou plusieurs événements de la liste n'existent pas.");
        }

        if (targetStatut == StatutPublication.ACTIF) {
            for (Evenement ev : events) {
                validateForPublication(ev);
            }
        }

        int count = 0;
        for (Evenement ev : events) {
            ev.setStatut(targetStatut);
            evenementRepository.save(ev);
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.MODERATION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.EVENEMENT,
                    "Événement '" + getEvenementNom(ev) + "' (#" + ev.getEvenementId() + ") publié (action groupée)",
                    admin
            );
            count++;
        }

        return count;
    }

    @Override
    @Transactional
    public CountsResponseDTO getCounts() {
        archiveOrDraftExpiredEvents();
        return CountsResponseDTO.builder()
                .total(evenementRepository.count())
                .actif(evenementRepository.countByStatut(StatutPublication.ACTIF))
                .brouillon(evenementRepository.countByStatut(StatutPublication.BROUILLON))
                .archive(evenementRepository.countByStatut(StatutPublication.ARCHIVE))
                .build();
    }

    @Override
    @Scheduled(cron = "0 0 * * * *") // Exécution chaque heure
    @Scheduled(fixedDelay = 60000, initialDelay = 5000) // Exécution toutes les 60s et au démarrage
    @Transactional
    public int archiveOrDraftExpiredEvents() {
        LocalDate today = LocalDate.now();
        int updated = evenementRepository.updateExpiredEventsStatut(StatutPublication.ACTIF, StatutPublication.BROUILLON, today);
        if (updated > 0) {
            log.info("[EVENEMENT EXPIRATION] {} événement(s) actif(s) passé(s) ont été automatiquement basculés en statut BROUILLON", updated);
        }
        return updated;
    }

    private void validateRequest(EvenementRequest request) {
        List<String> errors = new ArrayList<>();

        if (request.getNom() == null || request.getNom().get("fr") == null || request.getNom().get("fr").trim().isEmpty()) {
            errors.add("Le nom en français est obligatoire");
        }

        // La destination est optionnelle, mais si ni destination ni lieu libre → avertir
        boolean hasDestination = request.getDestinationId() != null && request.getDestinationId() > 0;
        boolean hasLieuLibre = request.getLieuLibre() != null && !request.getLieuLibre().trim().isEmpty();
        if (!hasDestination && !hasLieuLibre) {
            errors.add("Indiquez soit une destination existante, soit un lieu en texte libre");
        }

        // Validation stricte des dates (dateFin >= dateDebut)
        if (request.getDateDebut() != null && request.getDateFin() != null) {
            if (request.getDateFin().isBefore(request.getDateDebut())) {
                errors.add("La date de fin ne peut pas être antérieure à la date de début");
            }
        }

        if (!errors.isEmpty()) {
            throw new ValidationException(String.join(" • ", errors));
        }
    }

    public void validateForPublication(Evenement ev) {
        List<String> errors = new ArrayList<>();

        Map<String, String> nom = ev.getNom();
        if (nom == null || nom.get("fr") == null || nom.get("fr").trim().isEmpty()) {
            errors.add("Nom FR manquant");
        }

        // Un événement peut être publié avec soit une destination catalogue, soit un lieu libre
        boolean hasDestination = ev.getDestination() != null && ev.getDestination().getStatut() == StatutPublication.ACTIF;
        boolean hasLieuLibre = ev.getLieuLibre() != null && !ev.getLieuLibre().trim().isEmpty();
        if (!hasDestination && !hasLieuLibre) {
            errors.add("Indiquez un lieu : destination du catalogue ou lieu texte libre");
        }
        if (ev.getDestination() != null && ev.getDestination().getStatut() != StatutPublication.ACTIF) {
            errors.add("La destination liée doit être publiée (statut ACTIF)");
        }

        if (ev.getDateDebut() != null && ev.getDateFin() != null && ev.getDateFin().isBefore(ev.getDateDebut())) {
            errors.add("La date de fin ne peut pas être antérieure à la date de début");
        }

        LocalDate today = LocalDate.now();
        if (ev.getDateFin() != null && ev.getDateFin().isBefore(today)) {
            errors.add("Impossible de publier un événement dont la date de fin est déjà passée (" + ev.getDateFin() + ")");
        } else if (ev.getDateFin() == null && ev.getDateDebut() != null && ev.getDateDebut().isBefore(today)) {
            errors.add("Impossible de publier un événement dont la date de début est déjà passée (" + ev.getDateDebut() + ")");
        }

        if (!errors.isEmpty()) {
            throw new ValidationException("Impossible de publier l'événement : " + String.join(" • ", errors));
        }
    }
}
