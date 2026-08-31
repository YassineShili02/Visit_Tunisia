package tn.esprit.spring.visit_tunisia.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tn.esprit.spring.visit_tunisia.DTO.sentiment.SentimentRequest;
import tn.esprit.spring.visit_tunisia.entities.Avis;
import tn.esprit.spring.visit_tunisia.repositories.AvisRepository;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class SentimentAnalysisService {

    private final AvisRepository avisRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private static final String MICROSERVICE_URL = "http://localhost:8000/sentiment/analyser";

    public SentimentAnalysisService(AvisRepository avisRepository, ObjectMapper objectMapper) {
        this.avisRepository = avisRepository;
        this.objectMapper = objectMapper;
        
        // Use Java 11+ HttpClient for proper HTTP handling
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1) // Force HTTP/1.1 for compatibility
                .connectTimeout(Duration.ofSeconds(90)) // Long timeout for slow Gemini API responses
                .build();
    }

    /**
     * Analyze sentiment asynchronously after review creation.
     * This method runs in a background thread and never blocks the main flow.
     */
    @Async("taskExecutor")
    public void analyzeSentimentAsync(Integer avisId) {
        log.info("[Sentiment] Starting async analysis for review #{}", avisId);

        try {
            // Fetch the review
            Avis avis = avisRepository.findById(avisId).orElse(null);
            if (avis == null) {
                log.error("[Sentiment] Review #{} not found for analysis", avisId);
                return;
            }

            if (avis.getCommentaire() == null || avis.getCommentaire().isBlank()) {
                log.warn("[Sentiment] Review #{} has no comment, skipping analysis", avisId);
                return;
            }

            // Call microservice
            BigDecimal score = callSentimentMicroservice(avis.getCommentaire());

            // Calculate label from score
            String label = calculateLabelFromScore(score);

            // Update review
            avis.setSentimentScore(score);
            avis.setSentimentLabel(label);
            avisRepository.save(avis);

            log.info("[Sentiment] ✓ Review #{} analyzed: label={}, score={}", avisId, label, score);

        } catch (Exception e) {
            log.error("[Sentiment] ✗ Failed to analyze review #{}: {}", avisId, e.getMessage());
            // Don't rethrow - the review stays published with null sentiment
        }
    }

    /**
     * Call the sentiment analysis microservice.
     *
     * @param commentaire The review comment
     * @return Sentiment score (0.0-1.0)
     * @throws RuntimeException if the call fails
     */
    private BigDecimal callSentimentMicroservice(String commentaire) {
        try {
            SentimentRequest request = SentimentRequest.builder()
                    .commentaire(commentaire)
                    .build();

            log.info("[Sentiment] Calling microservice (comment length: {} chars)", commentaire.length());

            // Serialize request to JSON
            String jsonRequest = objectMapper.writeValueAsString(request);
            log.debug("[Sentiment] Request JSON: {}", jsonRequest);

            // Create HTTP request
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(MICROSERVICE_URL))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(90)) // Long timeout for slow Gemini API responses
                    .POST(HttpRequest.BodyPublishers.ofString(jsonRequest))
                    .build();

            // Send request and get response
            HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (httpResponse.statusCode() != 200) {
                throw new RuntimeException("HTTP " + httpResponse.statusCode() + ": " + httpResponse.body());
            }

            String jsonResponse = httpResponse.body();
            if (jsonResponse == null || jsonResponse.isBlank()) {
                throw new RuntimeException("Empty response from microservice");
            }

            // Parse response
            @SuppressWarnings("unchecked")
            Map<String, Object> responseMap = objectMapper.readValue(jsonResponse, Map.class);
            
            if (!responseMap.containsKey("score")) {
                throw new RuntimeException("Missing 'score' field in response: " + jsonResponse);
            }

            // Convert to BigDecimal
            Object scoreObj = responseMap.get("score");
            BigDecimal score;
            if (scoreObj instanceof Number) {
                score = BigDecimal.valueOf(((Number) scoreObj).doubleValue());
            } else {
                throw new RuntimeException("Invalid score type in response: " + scoreObj.getClass());
            }

            log.info("[Sentiment] ✓ Received score: {}", score);
            return score;

        } catch (Exception e) {
            log.error("[Sentiment] Microservice call failed: {}", e.getMessage());
            throw new RuntimeException("Microservice call failed: " + e.getMessage(), e);
        }
    }

    /**
     * Calculate sentiment label from score.
     * 
     * @param score Sentiment score (0.0-1.0)
     * @return "NEGATIF", "NEUTRE", or "POSITIF"
     */
    private String calculateLabelFromScore(BigDecimal score) {
        if (score.compareTo(BigDecimal.valueOf(0.4)) < 0) {
            return "NEGATIF";
        } else if (score.compareTo(BigDecimal.valueOf(0.6)) <= 0) {
            return "NEUTRE";
        } else {
            return "POSITIF";
        }
    }

    /**
     * Scheduled task to retry failed sentiment analyses.
     * Runs every 30 minutes and processes reviews with null sentiment
     * that are at least 10 minutes old.
     */
    @Scheduled(fixedRate = 30 * 60 * 1000) // 30 minutes
    public void retryFailedSentimentAnalyses() {
        log.info("[Sentiment] Starting scheduled retry of failed analyses");

        try {
            LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);

            // Find reviews with null sentiment that are old enough
            List<Avis> reviewsToRetry = avisRepository.findAll().stream()
                    .filter(a -> a.getSentimentLabel() == null)
                    .filter(a -> a.getCommentaire() != null && !a.getCommentaire().isBlank())
                    .filter(a -> a.getDateCreation().isBefore(tenMinutesAgo))
                    .toList();

            if (reviewsToRetry.isEmpty()) {
                log.info("[Sentiment] No reviews to retry");
                return;
            }

            log.info("[Sentiment] Found {} reviews to retry", reviewsToRetry.size());

            int successCount = 0;
            int failureCount = 0;

            for (Avis avis : reviewsToRetry) {
                try {
                    BigDecimal score = callSentimentMicroservice(avis.getCommentaire());
                    String label = calculateLabelFromScore(score);

                    avis.setSentimentScore(score);
                    avis.setSentimentLabel(label);
                    avisRepository.save(avis);

                    successCount++;
                    log.info("[Sentiment] ✓ Retry success for review #{}: label={}, score={}", 
                            avis.getAvisId(), label, score);

                } catch (Exception e) {
                    failureCount++;
                    log.warn("[Sentiment] ✗ Retry failed for review #{}: {}", 
                            avis.getAvisId(), e.getMessage());
                }
            }

            log.info("[Sentiment] Retry complete: {} succeeded, {} failed", successCount, failureCount);

        } catch (Exception e) {
            log.error("[Sentiment] Error in scheduled retry task", e);
        }
    }
}
