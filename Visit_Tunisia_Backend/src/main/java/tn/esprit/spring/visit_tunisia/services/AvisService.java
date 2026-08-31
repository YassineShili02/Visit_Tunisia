package tn.esprit.spring.visit_tunisia.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisRequestDTO;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisResponseDTO;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisStatsDTO;
import tn.esprit.spring.visit_tunisia.entities.Avis;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutModeration;
import tn.esprit.spring.visit_tunisia.exceptions.DestinationNotFoundException;
import tn.esprit.spring.visit_tunisia.repositories.AvisRepository;
import tn.esprit.spring.visit_tunisia.repositories.DestinationRepository;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AvisService {

    private final AvisRepository avisRepository;
    private final DestinationRepository destinationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final JournalActionService journalActionService;

    /**
     * Get review stats and list of reviews for a destination
     */
    @Transactional(readOnly = true)
    public AvisStatsDTO getReviewsForDestination(Integer destinationId, Authentication authentication) {
        Destination destination = destinationRepository.findById(destinationId)
                .orElseThrow(() -> new DestinationNotFoundException("Destination #" + destinationId + " non trouvée"));

        String currentEmail = authentication != null && authentication.isAuthenticated() ? authentication.getName() : null;

        List<Avis> avisList = avisRepository.findByDestinationDestinationIdOrderByDateCreationDesc(destinationId);

        Double noteMoyenneRaw = avisRepository.averageRatingByDestinationId(destinationId);
        Double noteMoyenne = noteMoyenneRaw != null ? Math.round(noteMoyenneRaw * 10.0) / 10.0 : 0.0;
        Long totalAvis = (long) avisList.size();

        Map<Integer, Long> distribution = new HashMap<>();
        for (int star = 1; star <= 5; star++) {
            int finalStar = star;
            long count = avisList.stream().filter(a -> a.getNote() != null && a.getNote() == finalStar).count();
            distribution.put(star, count);
        }

        List<AvisResponseDTO> items = avisList.stream().map(a -> {
            String authorName = a.getUtilisateur() != null
                    ? (a.getUtilisateur().getPrenom() != null ? a.getUtilisateur().getPrenom() + " " + a.getUtilisateur().getNom() : a.getUtilisateur().getNom())
                    : "Visiteur";
            String email = a.getUtilisateur() != null ? a.getUtilisateur().getEmail() : "";
            boolean isMine = currentEmail != null && currentEmail.equalsIgnoreCase(email);

            String avatar = authorName.length() >= 2 ? authorName.substring(0, 2).toUpperCase() : "VT";

            return AvisResponseDTO.builder()
                    .avisId(a.getAvisId())
                    .note(a.getNote())
                    .commentaire(a.getCommentaire())
                    .authorName(authorName)
                    .authorAvatar(avatar)
                    .authorEmail(email)
                    .dateCreation(a.getDateCreation())
                    .isMine(isMine)
                    .build();
        }).collect(Collectors.toList());

        return AvisStatsDTO.builder()
                .noteMoyenne(noteMoyenne)
                .totalAvis(totalAvis)
                .distributionEtoiles(distribution)
                .avisList(items)
                .build();
    }

    /**
     * Submit or update a review for a destination by current user (unique constraint)
     */
    @Transactional
    public AvisResponseDTO submitReview(Integer destinationId, AvisRequestDTO dto, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException("Vous devez être connecté pour laisser un avis");
        }

        String email = authentication.getName();
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé: " + email));

        Destination destination = destinationRepository.findById(destinationId)
                .orElseThrow(() -> new DestinationNotFoundException("Destination #" + destinationId + " non trouvée"));

        // Check if user already has an ACTIVE review (VALIDE or EN_ATTENTE) for this destination
        // Masked reviews (MASQUE) are ignored, allowing user to post a new review
        Optional<Avis> existing = avisRepository.findActiveByUtilisateurIdAndDestinationId(user.getUtilisateurId(), destinationId);

        Avis avis;
        boolean isNew = existing.isEmpty();
        if (!isNew) {
            // Update existing active review
            avis = existing.get();
            avis.setNote(dto.getNote());
            avis.setCommentaire(dto.getCommentaire());
            log.info("[AVIS] Mise à jour de l'avis #{} par user {}", avis.getAvisId(), user.getEmail());
        } else {
            // Create new review (either first time, or previous review was masked)
            avis = Avis.builder()
                    .note(dto.getNote())
                    .commentaire(dto.getCommentaire())
                    .utilisateur(user)
                    .destination(destination)
                    .statutModeration(StatutModeration.VALIDE)
                    .build();
            log.info("[AVIS] Nouvel avis par user {} sur destination {}", user.getEmail(), destinationId);
        }

        Avis saved = avisRepository.save(avis);

        // Get destination name for log details
        String destNom = "Destination #" + destinationId;
        if (destination.getNom() != null) {
            Map<String, String> nomMap = destination.getNom();
            destNom = nomMap.getOrDefault("fr", nomMap.getOrDefault("en", nomMap.getOrDefault("ar", destNom)));
        }

        journalActionService.enregistrer(
                isNew ? tn.esprit.spring.visit_tunisia.enums.TypeAction.CREATION : tn.esprit.spring.visit_tunisia.enums.TypeAction.MODIFICATION,
                tn.esprit.spring.visit_tunisia.enums.EntiteType.AVIS,
                isNew 
                    ? "Avis publié sur la destination '" + destNom + "' (note: " + saved.getNote() + "/5)"
                    : "Avis #" + saved.getAvisId() + " modifié sur la destination '" + destNom + "' (note: " + saved.getNote() + "/5)",
                user
        );

        // Trigger async sentiment analysis in the background
        // This runs in a separate thread and never blocks the response
        sentimentAnalysisService.analyzeSentimentAsync(saved.getAvisId());

        String authorName = user.getPrenom() != null ? user.getPrenom() + " " + user.getNom() : user.getNom();
        String avatar = authorName.length() >= 2 ? authorName.substring(0, 2).toUpperCase() : "VT";

        return AvisResponseDTO.builder()
                .avisId(saved.getAvisId())
                .note(saved.getNote())
                .commentaire(saved.getCommentaire())
                .authorName(authorName)
                .authorAvatar(avatar)
                .authorEmail(user.getEmail())
                .dateCreation(saved.getDateCreation())
                .isMine(true)
                .build();
    }

    /**
     * Get current user's review for a destination if it exists
     */
    @Transactional(readOnly = true)
    public Optional<AvisResponseDTO> getMyReview(Integer destinationId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        String email = authentication.getName();
        Optional<Utilisateur> userOpt = utilisateurRepository.findByEmail(email);
        if (userOpt.isEmpty()) return Optional.empty();

        Utilisateur user = userOpt.get();
        // Only return active (non-masked) review
        return avisRepository.findActiveByUtilisateurIdAndDestinationId(user.getUtilisateurId(), destinationId)
                .map(a -> {
                    String authorName = user.getPrenom() != null ? user.getPrenom() + " " + user.getNom() : user.getNom();
                    String avatar = authorName.length() >= 2 ? authorName.substring(0, 2).toUpperCase() : "VT";
                    return AvisResponseDTO.builder()
                            .avisId(a.getAvisId())
                            .note(a.getNote())
                            .commentaire(a.getCommentaire())
                            .authorName(authorName)
                            .authorAvatar(avatar)
                            .authorEmail(user.getEmail())
                            .dateCreation(a.getDateCreation())
                            .isMine(true)
                            .build();
                });
    }

    /**
     * Get all reviews submitted by current user
     */
    @Transactional(readOnly = true)
    public List<AvisResponseDTO> getMyAllReviews(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return List.of();
        }

        String email = authentication.getName();
        Optional<Utilisateur> userOpt = utilisateurRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.warn("[AVIS] User not found: {}", email);
            return List.of();
        }

        Utilisateur user = userOpt.get();
        log.info("[AVIS] Fetching all reviews for user #{}", user.getUtilisateurId());

        // Get all reviews by user (active and masked), ordered by date descending
        List<Avis> userReviews = avisRepository.findByUtilisateurUtilisateurIdOrderByDateCreationDesc(user.getUtilisateurId());

        return userReviews.stream().map(a -> {
            String authorName = (user.getPrenom() != null ? (user.getPrenom() + " " + user.getNom()) : user.getNom());
            String avatar = authorName != null && authorName.length() >= 2 ? authorName.substring(0, 2).toUpperCase() : "VT";
            
            // Include destination info in the response
            String destinationNom = "Destination inconnue";
            if (a.getDestination() != null && a.getDestination().getNom() != null) {
                // Get French name, fallback to any available language
                Map<String, String> nomMap = a.getDestination().getNom();
                destinationNom = nomMap.getOrDefault("fr", nomMap.values().stream().findFirst().orElse("Destination inconnue"));
            }
            Integer destinationId = a.getDestination() != null ? a.getDestination().getDestinationId() : null;
            
            // Get all categories and primary category
            String categorie = null;
            List<String> categories = null;
            if (a.getDestination() != null && a.getDestination().getCategories() != null && !a.getDestination().getCategories().isEmpty()) {
                categories = a.getDestination().getCategories().stream()
                        .map(c -> {
                            String name = c.name();
                            return name.substring(0, 1).toUpperCase() + name.substring(1).toLowerCase();
                        })
                        .collect(Collectors.toList());
                categorie = categories.get(0);
            }
            
            // Convert BigDecimal to Double for sentiment score
            Double sentimentScore = a.getSentimentScore() != null ? a.getSentimentScore().doubleValue() : null;
            
            return AvisResponseDTO.builder()
                    .avisId(a.getAvisId())
                    .note(a.getNote())
                    .commentaire(a.getCommentaire())
                    .authorName(authorName)
                    .authorAvatar(avatar)
                    .authorEmail(user.getEmail())
                    .dateCreation(a.getDateCreation())
                    .isMine(true)
                    .destinationNom(destinationNom)
                    .destinationId(destinationId)
                    .categorie(categorie)
                    .categories(categories)
                    .statutModeration(a.getStatutModeration())
                    .sentimentLabel(a.getSentimentLabel())
                    .sentimentScore(sentimentScore)
                    .build();
        }).collect(Collectors.toList());
    }
}
