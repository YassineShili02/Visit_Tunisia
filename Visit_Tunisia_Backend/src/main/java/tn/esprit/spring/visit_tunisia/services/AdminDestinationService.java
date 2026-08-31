package tn.esprit.spring.visit_tunisia.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.spring.visit_tunisia.DTO.admin.BulkRequestDTO;
import tn.esprit.spring.visit_tunisia.DTO.admin.CountsResponseDTO;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationRequest;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationResponse;
import tn.esprit.spring.visit_tunisia.config.ScraperProperties;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.enums.TypeDestination;
import tn.esprit.spring.visit_tunisia.exceptions.DestinationNotFoundException;
import tn.esprit.spring.visit_tunisia.exceptions.ImportException;
import tn.esprit.spring.visit_tunisia.exceptions.ValidationException;
import tn.esprit.spring.visit_tunisia.mappers.DestinationMapper;
import tn.esprit.spring.visit_tunisia.repositories.DestinationRepository;
import tn.esprit.spring.visit_tunisia.specifications.DestinationSpecifications;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminDestinationService implements IAdminDestinationService {

    private final DestinationRepository destinationRepository;
    private final DestinationMapper destinationMapper;
    private final ScraperProperties scraperProperties;
    private final ObjectMapper objectMapper;
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

    private String getDestinationNom(Destination d) {
        if (d == null || d.getNom() == null) return "Sans titre";
        Map<String, String> nom = d.getNom();
        return nom.getOrDefault("fr", nom.getOrDefault("en", nom.getOrDefault("ar", "Destination")));
    }

    // Progress tracker map: key = gouvernorat (lowercase), value = Map<String, Object> with status info
    private final Map<String, Map<String, Object>> importProgressMap = new ConcurrentHashMap<>();

    @Override
    public Map<String, Object> getImportStatus(String gouvernorat) {
        String key = gouvernorat.toLowerCase();
        return importProgressMap.getOrDefault(key, Map.of(
                "status", "NOT_STARTED",
                "progress", 0,
                "message", "Aucun import en cours pour " + gouvernorat
        ));
    }

    private void updateProgress(String g, String status, int progress, String message, Integer inserted, Integer skipped, String error) {
        String key = g.toLowerCase();
        Map<String, Object> state = new HashMap<>();
        state.put("gouvernorat", g);
        state.put("status", status); // IN_PROGRESS, COMPLETED, FAILED
        state.put("progress", progress); // 0 to 100
        state.put("message", message);
        if (inserted != null) state.put("insertedCount", inserted);
        if (skipped != null) state.put("skippedCount", skipped);
        if (error != null) state.put("error", error);
        importProgressMap.put(key, state);
    }

    // =========================================================================
    // IMPORT (Async)
    // =========================================================================

    @Async
    @Override
    @Transactional
    public void importDestinationsAsync(String gouvernorat, Utilisateur adminUser) {
        String g = gouvernorat.toLowerCase();
        String gNorm = java.text.Normalizer.normalize(gouvernorat, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase();

        log.info("[IMPORT] Démarrage de l'import pour le gouvernorat: {} (g={}, gNorm={})", gouvernorat, g, gNorm);
        updateProgress(gouvernorat, "IN_PROGRESS", 10, "Lancement du script Python...", 0, 0, null);

        try {
            // 1. Locate Python script file
            List<String> possibleScriptNames = List.of(
                    "scraper_" + g + ".py",
                    "scraper_" + gNorm + ".py",
                    "scraper.py",
                    "main.py"
            );

            Path scriptPath = null;
            for (String sName : possibleScriptNames) {
                Path p1 = Paths.get(scraperProperties.getScriptsDir(), sName);
                if (Files.exists(p1)) {
                    scriptPath = p1;
                    break;
                }
                Path p2 = Paths.get(".", "scraper", sName);
                if (Files.exists(p2)) {
                    scriptPath = p2;
                    break;
                }
            }

            if (scriptPath == null) {
                String errMsg = "Script Python introuvable pour " + gouvernorat + " dans ./scraper/ (ex: scraper_" + g + ".py ou scraper_" + gNorm + ".py)";
                log.error("[IMPORT] {}", errMsg);
                updateProgress(gouvernorat, "FAILED", 0, errMsg, 0, 0, errMsg);
                return;
            }

            updateProgress(gouvernorat, "IN_PROGRESS", 25, "Scraping OpenStreetMap & Wikidata en cours...", 0, 0, null);

            // Try python executables (python, python3, py)
            List<String> pythonCmds = List.of(scraperProperties.getPythonPath(), "python", "py", "python3");
            Process process = null;
            String chosenCmd = null;

            for (String cmd : pythonCmds) {
                try {
                    ProcessBuilder pb = new ProcessBuilder(cmd, "-u", scriptPath.toAbsolutePath().toString());
                    pb.directory(scriptPath.getParent().toFile());
                    pb.environment().put("PYTHONIOENCODING", "UTF-8");
                    pb.environment().put("PYTHONUTF8", "1");
                    pb.environment().put("PYTHONUNBUFFERED", "1");
                    pb.redirectErrorStream(true);
                    process = pb.start();
                    chosenCmd = cmd;
                    break;
                } catch (Exception ignored) {}
            }

            if (process == null) {
                String errMsg = "Impossible de trouver l'exécutable Python (python/py/python3). Vérifiez l'installation de Python sur votre PC.";
                log.error("[IMPORT] {}", errMsg);
                updateProgress(gouvernorat, "FAILED", 0, errMsg, 0, 0, errMsg);
                return;
            }

            // Stream process output in real-time with UTF-8 encoding & non-buffered updates
            StringBuilder outputLog = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), java.nio.charset.StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    outputLog.append(line).append("\n");
                    log.debug("[SCRAPER OUTPUT] {}", line);

                    if (line.contains("Overpass") || line.contains("OSM") || line.contains("fetch")) {
                        updateProgress(gouvernorat, "IN_PROGRESS", 35, "Récupération des données cartographiques (Overpass API)...", 0, 0, null);
                    } else if (line.contains("clean_and_score") || line.contains("destinations") || line.contains("filtrage")) {
                        updateProgress(gouvernorat, "IN_PROGRESS", 50, "Filtrage et calcul du score de qualité des lieux...", 0, 0, null);
                    } else if (line.contains("Wikidata") || line.contains("Wikipedia") || line.contains("enrich")) {
                        updateProgress(gouvernorat, "IN_PROGRESS", 70, "Enrichissement des descriptions & photos (Wikidata/Wikipedia)...", 0, 0, null);
                    } else if (line.contains("RÉSULTAT") || line.contains("Export") || line.contains("JSON") || line.contains("convert")) {
                        updateProgress(gouvernorat, "IN_PROGRESS", 85, "Génération du fichier JSON et préparation de l'injection BDD...", 0, 0, null);
                    }
                }
            }

            boolean finished = process.waitFor(scraperProperties.getTimeoutSeconds(), TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                String errMsg = "Le script scraper a dépassé le délai maximum de " + scraperProperties.getTimeoutSeconds() + "s";
                log.error("[IMPORT] {}", errMsg);
                updateProgress(gouvernorat, "FAILED", 0, errMsg, 0, 0, errMsg);
                return;
            }

            if (process.exitValue() != 0) {
                String errMsg = "Le script Python a échoué (exit code " + process.exitValue() + "): " + outputLog.toString();
                log.error("[IMPORT] {}", errMsg);
                updateProgress(gouvernorat, "FAILED", 0, "Échec du script Python: " + outputLog, 0, 0, errMsg);
                return;
            }

            log.info("[IMPORT] Scraper terminé avec succès pour {}", gouvernorat);
            updateProgress(gouvernorat, "IN_PROGRESS", 80, "Lecture du fichier JSON de sortie...", 0, 0, null);

            // 2. Locate generated output JSON file (checking both accented and unaccented names)
            List<String> possibleJsonNames = List.of(
                    "destinations_" + gNorm + "_final.json",
                    "destinations_" + g + "_final.json",
                    "destinations_" + gNorm + "_precis.json",
                    "destinations_" + g + "_precis.json",
                    "destinations_" + gNorm + ".json",
                    "destinations_" + g + ".json"
            );

            Path jsonPath = null;
            for (String jName : possibleJsonNames) {
                Path p1 = Paths.get(scraperProperties.getOutputDir(), jName);
                if (Files.exists(p1)) { jsonPath = p1; break; }
                Path p2 = Paths.get(scraperProperties.getScriptsDir(), jName);
                if (Files.exists(p2)) { jsonPath = p2; break; }
                Path p3 = Paths.get(".", jName);
                if (Files.exists(p3)) { jsonPath = p3; break; }
                Path p4 = scriptPath.getParent().resolve(jName);
                if (Files.exists(p4)) { jsonPath = p4; break; }
            }

            // Fallback: search directory for any destinations_*.json matching gNorm or g
            if (jsonPath == null) {
                try {
                    Path parentDir = scriptPath.getParent();
                    if (parentDir != null && Files.exists(parentDir)) {
                        try (var stream = Files.list(parentDir)) {
                            jsonPath = stream
                                    .filter(p -> p.getFileName().toString().endsWith(".json"))
                                    .filter(p -> p.getFileName().toString().startsWith("destinations_") &&
                                            (p.getFileName().toString().toLowerCase().contains(g) ||
                                             p.getFileName().toString().toLowerCase().contains(gNorm)))
                                    .findFirst()
                                    .orElse(null);
                        }
                    }
                } catch (Exception e) {
                    log.warn("[IMPORT] Fallback search directory scan failed: {}", e.getMessage());
                }
            }

            if (jsonPath == null) {
                String errMsg = "Le script s'est terminé mais le fichier JSON produit (ex: destinations_" + gNorm + "_final.json) est introuvable.";
                log.error("[IMPORT] {}", errMsg);
                updateProgress(gouvernorat, "FAILED", 0, errMsg, 0, 0, errMsg);
                return;
            }

            // 3. Read JSON content
            String jsonContent = Files.readString(jsonPath);
            JsonNode rootNode = objectMapper.readTree(jsonContent);

            List<JsonNode> rawDestinations = new ArrayList<>();
            if (rootNode.isArray()) {
                rootNode.forEach(rawDestinations::add);
            } else if (rootNode.has("destinations") && rootNode.get("destinations").isArray()) {
                rootNode.get("destinations").forEach(rawDestinations::add);
            }

            log.info("[IMPORT] {} destinations brutes lues depuis {}", rawDestinations.size(), jsonPath);
            updateProgress(gouvernorat, "IN_PROGRESS", 90, "Insertion et vérification des doublons en base...", 0, 0, null);

            // 4. Parse & insert with duplicate checks
            int inserted = 0;
            int skipped = 0;

            for (JsonNode node : rawDestinations) {
                try {
                    Destination dest = parseJsonNodeToDestination(node, gouvernorat);

                    if (isDuplicate(dest)) {
                        skipped++;
                        log.info("[IMPORT] Doublon ignoré: {} ({})", dest.getNom() != null ? dest.getNom().get("fr") : "", dest.getRegion());
                        continue;
                    }

                    destinationRepository.save(dest);
                    inserted++;
                } catch (Exception e) {
                    skipped++;
                    log.warn("[IMPORT] Erreur parsing destination: {}", e.getMessage());
                }
            }

            log.info("[IMPORT] Import terminé pour {} : {} insérées, {} ignorées", gouvernorat, inserted, skipped);

            // 5. Clean up JSON file
            try {
                Files.deleteIfExists(jsonPath);
            } catch (Exception ignored) {}

            String msg = "Import terminé avec succès ! " + inserted + " destination(s) ajoutée(s) en Brouillon, " + skipped + " doublon(s) ignoré(s).";
            updateProgress(gouvernorat, "COMPLETED", 100, msg, inserted, skipped, null);

            // Journaliser l'importation
            if (inserted > 0 && adminUser != null) {
                journalActionService.enregistrer(
                        tn.esprit.spring.visit_tunisia.enums.TypeAction.CREATION,
                        tn.esprit.spring.visit_tunisia.enums.EntiteType.DESTINATION,
                        "Import automatique de " + inserted + " destination(s) pour le gouvernorat " + gouvernorat,
                        adminUser
                );
            }

        } catch (ImportException e) {
            updateProgress(gouvernorat, "FAILED", 0, e.getMessage(), 0, 0, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("[IMPORT] Erreur inattendue: {}", e.getMessage(), e);
            updateProgress(gouvernorat, "FAILED", 0, "Erreur: " + e.getMessage(), 0, 0, e.getMessage());
            throw new ImportException("Erreur lors de l'import: " + e.getMessage(), e);
        }
    }

    // =========================================================================
    // LIST & ACTIONS
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<DestinationResponse> getDestinations(StatutPublication statut, String region, Categorie categorie, String search, Pageable pageable) {
        String cleanRegion = (region != null && !region.trim().isEmpty() && !"Tous".equalsIgnoreCase(region)) ? region.trim() : null;
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        Categorie cleanCategorie = categorie; // null if "Tous" — handled by controller layer

        Specification<Destination> spec = DestinationSpecifications.withFilters(statut, cleanRegion, cleanCategorie, cleanSearch);
        Page<Destination> page = destinationRepository.findAll(spec, pageable);
        return page.map(destinationMapper::toResponse);
    }

    @Override
    @Transactional
    public DestinationResponse updateStatut(Integer id, StatutPublication newStatut) {
        Destination dest = destinationRepository.findById(id)
                .orElseThrow(() -> new DestinationNotFoundException("Destination introuvable (ID: " + id + ")"));

        if (newStatut == StatutPublication.ACTIF) {
            validateForPublication(dest);
        }

        dest.setStatut(newStatut);
        Destination saved = destinationRepository.save(dest);

        String destNom = getDestinationNom(saved);
        Utilisateur admin = getCurrentAdminUser();
        if (newStatut == StatutPublication.ACTIF) {
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.MODERATION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.DESTINATION,
                    "Destination '" + destNom + "' (#" + id + ") publiée",
                    admin
            );
        } else if (newStatut == StatutPublication.ARCHIVE) {
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.SUPPRESSION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.DESTINATION,
                    "Destination '" + destNom + "' (#" + id + ") archivée",
                    admin
            );
        } else {
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.DESTINATION,
                    "Destination '" + destNom + "' (#" + id + ") passée au statut " + newStatut,
                    admin
            );
        }

        return destinationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteDestination(Integer id) {
        Destination dest = destinationRepository.findById(id)
                .orElseThrow(() -> new DestinationNotFoundException("Destination introuvable (ID: " + id + ")"));
        String destNom = getDestinationNom(dest);
        destinationRepository.delete(dest);
        log.info("[DELETE] Destination {} supprimée", id);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.SUPPRESSION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.DESTINATION,
                "Destination '" + destNom + "' (#" + id + ") supprimée",
                getCurrentAdminUser()
        );
    }

    @Override
    @Transactional
    public DestinationResponse updateDestination(Integer id, DestinationRequest request) {
        Destination dest = destinationRepository.findById(id)
                .orElseThrow(() -> new DestinationNotFoundException("Destination introuvable (ID: " + id + ")"));

        destinationMapper.updateEntityFromRequest(request, dest);

        if (request.getLatitude() != null) dest.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) dest.setLongitude(request.getLongitude());

        Destination saved = destinationRepository.save(dest);

        journalActionService.enregistrer(
                tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.DESTINATION,
                "Destination '" + getDestinationNom(saved) + "' (#" + id + ") modifiée",
                getCurrentAdminUser()
        );

        return destinationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public int bulkAction(BulkRequestDTO dto) {
        Utilisateur admin = getCurrentAdminUser();

        if ("DELETE".equalsIgnoreCase(dto.getAction())) {
            List<Destination> destinations = destinationRepository.findAllByDestinationIdIn(dto.getIds());
            for (Destination d : destinations) {
                journalActionService.enregistrer(
                        tn.esprit.spring.visit_tunisia.enums.TypeAction.SUPPRESSION,
                        tn.esprit.spring.visit_tunisia.enums.EntiteType.DESTINATION,
                        "Destination '" + getDestinationNom(d) + "' (#" + d.getDestinationId() + ") supprimée (action groupée)",
                        admin
                );
            }
            destinationRepository.deleteAll(destinations);
            log.info("[BULK DELETE] {} destinations supprimées", destinations.size());
            return destinations.size();
        }

        StatutPublication targetStatut;
        if ("PUBLISH".equalsIgnoreCase(dto.getAction())) {
            targetStatut = StatutPublication.ACTIF;
        } else {
            throw new ValidationException("Action inconnue: " + dto.getAction() + ". Utilisez PUBLISH ou DELETE.");
        }

        List<Destination> destinations = destinationRepository.findAllByDestinationIdIn(dto.getIds());

        if (destinations.size() != dto.getIds().size()) {
            throw new DestinationNotFoundException("Une ou plusieurs destinations de la liste n'existent pas.");
        }

        if (targetStatut == StatutPublication.ACTIF) {
            for (Destination d : destinations) {
                validateForPublication(d);
            }
        }

        int count = 0;
        for (Destination d : destinations) {
            d.setStatut(targetStatut);
            destinationRepository.save(d);
            journalActionService.enregistrer(
                    tn.esprit.spring.visit_tunisia.enums.TypeAction.MODERATION,
                    tn.esprit.spring.visit_tunisia.enums.EntiteType.DESTINATION,
                    "Destination '" + getDestinationNom(d) + "' (#" + d.getDestinationId() + ") publiée (action groupée)",
                    admin
            );
            count++;
        }

        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public CountsResponseDTO getCounts() {
        return CountsResponseDTO.builder()
                .total(destinationRepository.count())
                .actif(destinationRepository.countByStatut(StatutPublication.ACTIF))
                .brouillon(destinationRepository.countByStatut(StatutPublication.BROUILLON))
                .archive(destinationRepository.countByStatut(StatutPublication.ARCHIVE))
                .build();
    }

    public void validateForPublication(Destination dest) {
        List<String> errors = new ArrayList<>();
        Map<String, String> nom = dest.getNom();
        if (nom == null || nom.get("fr") == null || nom.get("fr").trim().isEmpty()) {
            errors.add("Nom FR manquant");
        }

        Map<String, String> desc = dest.getDescription();
        if (desc == null || desc.get("fr") == null || desc.get("fr").trim().length() < 20) {
            int len = (desc != null && desc.get("fr") != null) ? desc.get("fr").trim().length() : 0;
            errors.add("Description FR trop courte (" + len + " caractères, minimum 20)");
        }

        if (dest.getLatitude() == null || dest.getLongitude() == null) {
            errors.add("Coordonnées GPS manquantes");
        }

        if (dest.getCategories() == null || dest.getCategories().isEmpty()) {
            errors.add("Au moins 1 catégorie requise");
        }

        if (!errors.isEmpty()) {
            throw new ValidationException("Impossible de publier : " + String.join(" • ", errors));
        }
    }

    private boolean isDuplicate(Destination dest) {
        String nomFr = dest.getNom() != null ? dest.getNom().get("fr") : null;
        String region = dest.getRegion();

        if (nomFr != null && !nomFr.trim().isEmpty() && region != null && !region.trim().isEmpty()) {
            if (destinationRepository.existsByNomFrAndRegion(nomFr, region)) {
                return true;
            }
        }

        if (dest.getLatitude() != null && dest.getLongitude() != null) {
            if (destinationRepository.existsByProximity(dest.getLatitude(), dest.getLongitude())) {
                return true;
            }
        }

        return false;
    }

    private Destination parseJsonNodeToDestination(JsonNode node, String gouvernorat) {
        Map<String, String> nom = new HashMap<>();
        JsonNode nomNode = node.get("nom");
        if (nomNode != null) {
            if (nomNode.isObject()) {
                nomNode.fields().forEachRemaining(e -> nom.put(e.getKey(), e.getValue().asText()));
            } else if (nomNode.isTextual()) {
                nom.put("fr", nomNode.asText());
            }
        }

        Map<String, String> description = new HashMap<>();
        JsonNode descNode = node.get("description");
        if (descNode != null) {
            if (descNode.isObject()) {
                descNode.fields().forEachRemaining(e -> description.put(e.getKey(), e.getValue().asText()));
            } else if (descNode.isTextual()) {
                description.put("fr", descNode.asText());
            }
        }

        TypeDestination type = TypeDestination.SITE_TOURISTIQUE;
        if (node.has("type") && node.get("type").isTextual()) {
            try {
                type = TypeDestination.valueOf(node.get("type").asText().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        Set<Categorie> categories = new HashSet<>();
        JsonNode catNode = node.get("categories");
        if (catNode != null && catNode.isArray()) {
            for (JsonNode c : catNode) {
                try {
                    categories.add(Categorie.valueOf(c.asText().toUpperCase()));
                } catch (IllegalArgumentException ignored) {}
            }
        }

        Double latitude = node.has("latitude") && !node.get("latitude").isNull() ? node.get("latitude").asDouble() : null;
        Double longitude = node.has("longitude") && !node.get("longitude").isNull() ? node.get("longitude").asDouble() : null;

        List<String> photos = new ArrayList<>();
        JsonNode photosNode = node.get("photos");
        if (photosNode != null && photosNode.isArray()) {
            for (JsonNode p : photosNode) photos.add(p.asText());
        }

        BigDecimal tarifEstime = node.has("tarifEstime") && !node.get("tarifEstime").isNull() ? BigDecimal.valueOf(node.get("tarifEstime").asDouble()) : null;
        Boolean accessibilitePmr = node.has("accessibilitePmr") && !node.get("accessibilitePmr").isNull() ? node.get("accessibilitePmr").asBoolean() : false;

        Map<String, Object> horaires = null;
        if (node.has("horaires") && node.get("horaires").isObject()) {
            horaires = objectMapper.convertValue(node.get("horaires"), new TypeReference<Map<String, Object>>() {});
        }

        Map<String, Object> attributsSpecifiques = new HashMap<>();
        if (node.has("attributsSpecifiques") && node.get("attributsSpecifiques").isObject()) {
            attributsSpecifiques = objectMapper.convertValue(node.get("attributsSpecifiques"), new TypeReference<Map<String, Object>>() {});
        }
        if (node.has("quality_score")) {
            attributsSpecifiques.put("qualityScore", node.get("quality_score").asInt());
        }

        String region = node.has("region") && node.get("region").isTextual() ? node.get("region").asText() : gouvernorat;

        return Destination.builder()
                .nom(nom)
                .description(description)
                .type(type)
                .categories(categories)
                .region(region)
                .latitude(latitude)
                .longitude(longitude)
                .horaires(horaires)
                .attributsSpecifiques(attributsSpecifiques)
                .tarifEstime(tarifEstime)
                .accessibilitePmr(accessibilitePmr)
                .photos(photos)
                .statut(StatutPublication.BROUILLON)
                .build();
    }
}
