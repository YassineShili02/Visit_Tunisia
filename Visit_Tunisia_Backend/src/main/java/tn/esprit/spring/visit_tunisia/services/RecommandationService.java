package tn.esprit.spring.visit_tunisia.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationResponse;
import tn.esprit.spring.visit_tunisia.DTO.recommandation.DestinationCandidat;
import tn.esprit.spring.visit_tunisia.DTO.recommandation.DestinationSignal;
import tn.esprit.spring.visit_tunisia.DTO.recommandation.RecommandationAIRequest;
import tn.esprit.spring.visit_tunisia.entities.Avis;
import tn.esprit.spring.visit_tunisia.entities.ConsultationLog;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.enums.TypeConsultation;
import tn.esprit.spring.visit_tunisia.mappers.DestinationMapper;
import tn.esprit.spring.visit_tunisia.repositories.AvisRepository;
import tn.esprit.spring.visit_tunisia.repositories.ConsultationLogRepository;
import tn.esprit.spring.visit_tunisia.repositories.DestinationRepository;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommandationService {

    private final AvisRepository avisRepository;
    private final ConsultationLogRepository consultationLogRepository;
    private final DestinationRepository destinationRepository;
    private final DestinationMapper destinationMapper;
    private final ObjectMapper objectMapper;

    private static final String AI_URL = "http://localhost:8000/recommandations/calculer";
    private static final int TOP_N = 8;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    // ─────────────────────────────────────────────────────────────────────────
    // Point d'entrée principal
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calcule les recommandations personnalisées pour l'utilisateur.
     * Retourne une liste vide si l'utilisateur n'a pas assez de données personnelles.
     */
    public List<DestinationResponse> getRecommandations(Utilisateur user) {
        Integer userId = user.getUtilisateurId();

        // ── 1. Vérification suffisance de données ─────────────────────────────
        boolean hasPreferences = user.getPreferences() != null && !user.getPreferences().isEmpty();
        boolean hasAvis = avisRepository.countDestinationAvisByUtilisateur(userId) > 0;
        boolean hasConsultations = consultationLogRepository
                .countByUtilisateurIdAndType(userId, TypeConsultation.VUE_DESTINATION) > 0;

        if (!hasPreferences && !hasAvis && !hasConsultations) {
            log.info("[Recommandation] User #{} — aucune donnée personnelle, retour liste vide", userId);
            return List.of();
        }

        // ── 2. Rassemblement des signaux ──────────────────────────────────────

        // Signal 1 : préférences explicites (poids 3)
        List<String> preferences = user.getPreferences() != null
                ? user.getPreferences().stream().map(Categorie::name).collect(Collectors.toList())
                : List.of();

        // Signal 2 : destinations appréciées — note >= 4 OU sentimentLabel = POSITIF (poids 2)
        List<Avis> apprecees = avisRepository.findAppreciesByUtilisateur(userId);
        List<DestinationSignal> destinationsAppreciees = apprecees.stream()
                .filter(a -> a.getDestination() != null)
                .map(a -> DestinationSignal.builder()
                        .destinationId(a.getDestination().getDestinationId())
                        .categories(a.getDestination().getCategories().stream()
                                .map(Categorie::name).collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());

        // Signal 3 : destinations vues dans les 90 derniers jours (poids 1)
        LocalDateTime since90j = LocalDateTime.now().minusDays(90);
        List<ConsultationLog> vues = consultationLogRepository.findVueDestination90j(userId, since90j);
        List<DestinationSignal> destinationsVues = vues.stream()
                .filter(c -> c.getDestination() != null)
                .map(c -> DestinationSignal.builder()
                        .destinationId(c.getDestination().getDestinationId())
                        .categories(c.getDestination().getCategories().stream()
                                .map(Categorie::name).collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());

        // ── 3. Sélection des candidats ACTIF (PUBLIE), hors destinations déjà avisées ───

        Set<Integer> deja_avisees = new HashSet<>(avisRepository.findDestinationIdsAvisByUtilisateur(userId));

        // Destinations ACTIF chargées en 1 seule requête SQL avec leurs catégories (JOIN FETCH)
        List<Destination> allActifs = destinationRepository.findActiveWithCategories(StatutPublication.ACTIF).stream()
                .filter(d -> !deja_avisees.contains(d.getDestinationId()))
                .collect(Collectors.toList());

        if (allActifs.isEmpty()) {
            log.info("[Recommandation] Aucun candidat ACTIF disponible pour user #{}", userId);
            return List.of();
        }

        // ── 4. Agrégation note + sentiment par candidat ───────────────────────

        List<Integer> candidatIds = allActifs.stream()
                .map(Destination::getDestinationId)
                .collect(Collectors.toList());

        // Map destinationId → [avgNote, avgSentiment]
        Map<Integer, double[]> aggMap = new HashMap<>();
        if (!candidatIds.isEmpty()) {
            List<Object[]> rows = avisRepository.findAggregatedScoresByDestinationIds(candidatIds);
            for (Object[] row : rows) {
                Integer destId = (Integer) row[0];
                double avgNote = row[1] != null ? ((Number) row[1]).doubleValue() : 3.5;
                double avgSentiment = row[2] != null ? ((Number) row[2]).doubleValue() : 0.5;
                aggMap.put(destId, new double[]{avgNote, avgSentiment});
            }
        }

        List<DestinationCandidat> candidats = allActifs.stream()
                .map(d -> {
                    double[] agg = aggMap.getOrDefault(d.getDestinationId(), new double[]{3.5, 0.5});
                    return DestinationCandidat.builder()
                            .destinationId(d.getDestinationId())
                            .categories(d.getCategories().stream()
                                    .map(Categorie::name).collect(Collectors.toList()))
                            .noteMoyenne(agg[0])
                            .sentimentMoyen(agg[1])
                            .build();
                })
                .collect(Collectors.toList());

        // ── 5. Appel FastAPI ──────────────────────────────────────────────────

        RecommandationAIRequest aiRequest = RecommandationAIRequest.builder()
                .preferences(preferences)
                .destinationsAppreciees(destinationsAppreciees)
                .destinationsVues(destinationsVues)
                .candidats(candidats)
                .build();

        List<Integer> orderedIds = callFastAPI(aiRequest);
        if (orderedIds == null || orderedIds.isEmpty()) {
            log.warn("[Recommandation] FastAPI returned empty result for user #{}", userId);
            return List.of();
        }

        // ── 6. Rechargement des destinations dans l'ordre du score ────────────

        Map<Integer, Destination> destMap = destinationRepository.findByIdsWithCategories(orderedIds)
                .stream().collect(Collectors.toMap(Destination::getDestinationId, d -> d));

        return orderedIds.stream()
                .filter(destMap::containsKey)
                .map(id -> destinationMapper.toResponse(destMap.get(id)))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Appel HTTP vers le microservice FastAPI
    // ─────────────────────────────────────────────────────────────────────────

    private List<Integer> callFastAPI(RecommandationAIRequest request) {
        try {
            String body = objectMapper.writeValueAsString(request);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(AI_URL))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("[Recommandation] FastAPI error HTTP {}: {}", response.statusCode(), response.body());
                return List.of();
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode recommandations = root.path("recommandations");

            List<Integer> ids = new ArrayList<>();
            for (JsonNode item : recommandations) {
                ids.add(item.path("destinationId").asInt());
            }
            return ids;

        } catch (Exception e) {
            log.error("[Recommandation] Exception lors de l'appel FastAPI: {}", e.getMessage(), e);
            return List.of();
        }
    }
}
