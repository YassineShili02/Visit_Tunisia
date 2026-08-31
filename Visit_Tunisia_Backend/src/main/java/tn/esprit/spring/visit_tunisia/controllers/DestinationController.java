package tn.esprit.spring.visit_tunisia.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationPinResponse;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationResponse;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.enums.TypeDestination;
import tn.esprit.spring.visit_tunisia.exceptions.DestinationNotFoundException;
import tn.esprit.spring.visit_tunisia.mappers.DestinationMapper;
import tn.esprit.spring.visit_tunisia.repositories.DestinationRepository;
import tn.esprit.spring.visit_tunisia.services.ConsultationLogService;
import tn.esprit.spring.visit_tunisia.specifications.DestinationSpecifications;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/destinations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class DestinationController {

    private final DestinationRepository destinationRepository;
    private final DestinationMapper destinationMapper;
    private final ConsultationLogService consultationLogService;

    /**
     * GET /api/destinations
     * Public endpoint to fetch published destinations (statut = ACTIF) for tourists.
     * Supports pagination (page, size) and filtering by region, categorie, type, search, maxPrice.
     */
    @GetMapping
    public ResponseEntity<Page<DestinationResponse>> getActiveDestinations(
            @RequestParam(required = false) String region,
            @RequestParam(name = "categories", required = false) List<Categorie> categories,
            @RequestParam(name = "categorie", required = false) List<Categorie> categorieSingle,
            @RequestParam(name = "types", required = false) List<TypeDestination> types,
            @RequestParam(name = "type", required = false) List<TypeDestination> typeSingle,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        List<Categorie> effectiveCategories = (categories != null && !categories.isEmpty()) ? categories : categorieSingle;
        List<TypeDestination> effectiveTypes = (types != null && !types.isEmpty()) ? types : typeSingle;

        log.info("[PUBLIC] GET /api/destinations - page={}, size={}, region={}, cats={}, types={}", page, size, region, effectiveCategories, effectiveTypes);
        Pageable pageable = PageRequest.of(page, size);

        String cleanRegion = (region != null && !region.isBlank() && !"Tous".equalsIgnoreCase(region)) ? region.trim() : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        Specification<Destination> spec = DestinationSpecifications.withFilters(
                StatutPublication.ACTIF,
                cleanRegion,
                effectiveCategories,
                effectiveTypes,
                cleanSearch,
                maxPrice
        );

        Page<DestinationResponse> result = destinationRepository.findAll(spec, pageable)
                .map(destinationMapper::toResponse);

        // Log la recherche si un terme est fourni (utilisateurs connectés uniquement)
        if (cleanSearch != null) {
            consultationLogService.logRecherche(cleanSearch, consultationLogService.resolveCurrentUser());
        }

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/destinations/{id}
     * Public endpoint to fetch a single destination by ID for detail page view.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DestinationResponse> getDestinationById(@PathVariable Integer id) {
        log.info("[PUBLIC] GET /api/destinations/{}", id);
        Destination dest = destinationRepository.findById(id)
                .orElseThrow(() -> new DestinationNotFoundException("Destination introuvable (#" + id + ")"));

        // Enregistrement asynchrone (utilisateur résolu dans le thread HTTP principal)
        consultationLogService.logVueDestination(dest, consultationLogService.resolveCurrentUser());

        return ResponseEntity.ok(destinationMapper.toResponse(dest));
    }

    /**
     * GET /api/destinations/pins
     * Lightweight endpoint to fetch only map pins data (id, nom, lat, lng, category).
     * Returns ALL active destinations matching filters, without pagination.
     * Used for displaying all markers on map while list is paginated.
     */
    @GetMapping("/pins")
    public ResponseEntity<List<DestinationPinResponse>> getAllPinsForMap(
            @RequestParam(required = false) String region,
            @RequestParam(name = "categories", required = false) List<Categorie> categories,
            @RequestParam(name = "categorie", required = false) List<Categorie> categorieSingle,
            @RequestParam(name = "types", required = false) List<TypeDestination> types,
            @RequestParam(name = "type", required = false) List<TypeDestination> typeSingle,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) BigDecimal maxPrice
    ) {
        List<Categorie> effectiveCategories = (categories != null && !categories.isEmpty()) ? categories : categorieSingle;
        List<TypeDestination> effectiveTypes = (types != null && !types.isEmpty()) ? types : typeSingle;

        log.info("[PUBLIC] GET /api/destinations/pins - region={}, cats={}, types={}", region, effectiveCategories, effectiveTypes);

        String cleanRegion = (region != null && !region.isBlank() && !"Tous".equalsIgnoreCase(region)) ? region.trim() : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        Specification<Destination> spec = DestinationSpecifications.withFilters(
                StatutPublication.ACTIF,
                cleanRegion,
                effectiveCategories,
                effectiveTypes,
                cleanSearch,
                maxPrice
        );

        List<DestinationPinResponse> pins = destinationRepository.findAll(spec).stream()
                .filter(d -> d.getLatitude() != null && d.getLongitude() != null)
                .map(d -> DestinationPinResponse.builder()
                        .destinationId(d.getDestinationId())
                        .nom(d.getNom())
                        .latitude(d.getLatitude())
                        .longitude(d.getLongitude())
                        .categories(d.getCategories())
                        .tarifEstime(d.getTarifEstime())
                        .img(d.getPhotos() != null && !d.getPhotos().isEmpty() ? d.getPhotos().get(0) : null)
                        .build())
                .toList();

        return ResponseEntity.ok(pins);
    }

    /**
     * GET /api/destinations/search
     * Autocomplete endpoint for destination search.
     * Searches across name (fr, en, ar), region, type and attributes with accent-insensitive multi-word token matching.
     * Supports composite queries like "Tunis, Cité de la Culture", "El Jem", etc.
     */
    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchDestinations(
            @RequestParam(required = false) String q
    ) {
        log.info("[PUBLIC] GET /api/destinations/search?q={}", q);
        List<Destination> allDestinations = destinationRepository.findAll();

        if (q == null || q.isBlank()) {
            List<Map<String, Object>> defaultList = allDestinations.stream()
                    .filter(d -> d.getStatut() == StatutPublication.ACTIF)
                    .sorted((d1, d2) -> {
                        String n1 = d1.getNom() != null ? d1.getNom().getOrDefault("fr", "") : "";
                        String n2 = d2.getNom() != null ? d2.getNom().getOrDefault("fr", "") : "";
                        return n1.compareToIgnoreCase(n2);
                    })
                    .limit(25)
                    .map(this::mapDestinationToSearchItem)
                    .toList();
            return ResponseEntity.ok(defaultList);
        }

        String normalizedQuery = normalizeText(q);
        String[] rawTokens = normalizedQuery.split("[\\s,;:\\-_/.]+");
        List<String> tokens = java.util.Arrays.stream(rawTokens)
                .filter(t -> !t.isBlank() && t.length() > 1)
                .toList();

        if (tokens.isEmpty()) {
            tokens = List.of(normalizedQuery);
        }

        final List<String> searchTokens = tokens;

        record ScoredDest(Destination destination, int score) {}

        List<Map<String, Object>> results = allDestinations.stream()
                .map(d -> {
                    if (d.getNom() == null) return new ScoredDest(d, 0);

                    String nomFr = normalizeText(d.getNom().getOrDefault("fr", ""));
                    String nomEn = normalizeText(d.getNom().getOrDefault("en", ""));
                    String nomAr = normalizeText(d.getNom().getOrDefault("ar", ""));
                    String region = normalizeText(d.getRegion());
                    String type = d.getType() != null ? normalizeText(d.getType().name()) : "";

                    String composite = (nomFr + " " + nomEn + " " + nomAr + " " + region + " " + type).trim();

                    int score = 0;

                    // 1. Phrase / Whole string matching
                    if (nomFr.equals(normalizedQuery) || nomEn.equals(normalizedQuery)) {
                        score += 500;
                    } else if (nomFr.startsWith(normalizedQuery)) {
                        score += 300;
                    } else if (nomFr.contains(normalizedQuery)) {
                        score += 200;
                    } else if (composite.contains(normalizedQuery)) {
                        score += 150;
                    }

                    // 2. Token-by-token matching
                    int matchedTokens = 0;
                    for (String token : searchTokens) {
                        if (nomFr.contains(token) || nomEn.contains(token) || nomAr.contains(token)) {
                            score += 40;
                            matchedTokens++;
                        } else if (region.contains(token)) {
                            score += 20;
                            matchedTokens++;
                        } else if (type.contains(token)) {
                            score += 10;
                            matchedTokens++;
                        }
                    }

                    // Strict matching rule:
                    // If multiple tokens are provided (e.g. "Tunis, Cité de la Culture"),
                    // ALL tokens must be present in the composite string.
                    if (searchTokens.size() > 1 && matchedTokens < searchTokens.size()) {
                        score = 0; // Reject destinations that only match 1 word out of 3
                    } else if (matchedTokens == searchTokens.size()) {
                        score += 100;
                    }

                    if (d.getStatut() == StatutPublication.ACTIF && score > 0) {
                        score += 5;
                    }

                    return new ScoredDest(d, score);
                })
                .filter(sd -> sd.score > 0)
                .sorted((a, b) -> Integer.compare(b.score, a.score))
                .limit(25)
                .map(sd -> mapDestinationToSearchItem(sd.destination))
                .toList();

        log.info("[PUBLIC] Found {} destinations matching query '{}'", results.size(), q);
        // Enregistrer la recherche (utilisateur résolu dans le thread HTTP principal)
        if (q != null && !q.isBlank()) {
            consultationLogService.logRecherche(q, consultationLogService.resolveCurrentUser());
        }
        return ResponseEntity.ok(results);
    }

    private Map<String, Object> mapDestinationToSearchItem(Destination d) {
        Map<String, Object> item = new java.util.HashMap<>();
        item.put("id", d.getDestinationId());
        item.put("nom", d.getNom());
        item.put("region", d.getRegion());
        item.put("type", d.getType() != null ? d.getType().name() : null);
        item.put("statut", d.getStatut() != null ? d.getStatut().name() : null);
        return item;
    }

    private String normalizeText(String input) {
        if (input == null) return "";
        String nfd = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        String cleaned = nfd.replaceAll("\\p{M}", "").toLowerCase().trim();
        return cleaned.replace("musace", "musee")
                      .replace("macdina", "medina")
                      .replace("amphithacatre", "amphitheatre")
                      .replace("mosquace", "mosquee")
                      .replace("ha'tel", "hotel")
                      .replace("cafac", "cafe");
    }

    /**
     * GET /api/destinations/{id}/nearby
     * Get nearby destinations within a certain radius (default 20km).
     * Returns destinations sorted by distance.
     */
    @GetMapping("/{id}/nearby")
    public ResponseEntity<List<Map<String, Object>>> getNearbyDestinations(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "20") double radiusKm,
            @RequestParam(defaultValue = "5") int limit
    ) {
        log.info("[PUBLIC] GET /api/destinations/{}/nearby - radius={}km, limit={}", id, radiusKm, limit);
        
        Destination currentDest = destinationRepository.findById(id)
                .orElseThrow(() -> new DestinationNotFoundException("Destination introuvable (#" + id + ")"));
        
        if (currentDest.getLatitude() == null || currentDest.getLongitude() == null) {
            log.warn("[PUBLIC] Destination #{} has no coordinates", id);
            return ResponseEntity.ok(List.of());
        }
        
        double lat1 = currentDest.getLatitude();
        double lon1 = currentDest.getLongitude();
        
        List<Map<String, Object>> nearby = destinationRepository.findAll().stream()
                .filter(d -> !d.getDestinationId().equals(id)) // Exclude current destination
                .filter(d -> d.getStatut() == StatutPublication.ACTIF) // Only active
                .filter(d -> d.getLatitude() != null && d.getLongitude() != null) // Has coordinates
                .map(d -> {
                    double distance = calculateDistance(lat1, lon1, d.getLatitude(), d.getLongitude());
                    Map<String, Object> item = new java.util.HashMap<>();
                    item.put("destinationId", d.getDestinationId());
                    item.put("nom", d.getNom());
                    item.put("type", d.getType() != null ? d.getType().name() : null);
                    item.put("categories", d.getCategories());
                    item.put("region", d.getRegion());
                    item.put("latitude", d.getLatitude());
                    item.put("longitude", d.getLongitude());
                    item.put("tarifEstime", d.getTarifEstime());
                    item.put("imageUrl", d.getPhotos() != null && !d.getPhotos().isEmpty() ? d.getPhotos().get(0) : null);
                    item.put("distanceKm", Math.round(distance * 10.0) / 10.0); // Round to 1 decimal
                    return item;
                })
                .filter(item -> (Double) item.get("distanceKm") <= radiusKm) // Within radius
                .sorted((a, b) -> Double.compare((Double) a.get("distanceKm"), (Double) b.get("distanceKm"))) // Sort by distance
                .limit(limit)
                .toList();
        
        log.info("[PUBLIC] Found {} destinations within {}km of #{}", nearby.size(), radiusKm, id);
        return ResponseEntity.ok(nearby);
    }

    /**
     * Calculate distance between two GPS coordinates using Haversine formula.
     * Returns distance in kilometers.
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int EARTH_RADIUS_KM = 6371;
        
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS_KM * c;
    }
}
