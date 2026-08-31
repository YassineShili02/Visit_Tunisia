package tn.esprit.spring.visit_tunisia.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.spring.visit_tunisia.DTO.favorite.FavoriteDestinationResponse;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.entities.DestinationFavorite;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutModeration;
import tn.esprit.spring.visit_tunisia.exceptions.DestinationNotFoundException;
import tn.esprit.spring.visit_tunisia.repositories.AvisRepository;
import tn.esprit.spring.visit_tunisia.repositories.DestinationFavoriteRepository;
import tn.esprit.spring.visit_tunisia.repositories.DestinationRepository;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FavoriteService {

    private final DestinationFavoriteRepository favoriteRepository;
    private final DestinationRepository destinationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final AvisRepository avisRepository;

    /**
     * Add a destination to user's favorites
     */
    @Transactional
    public void addFavorite(Integer utilisateurId, Integer destinationId) {
        log.info("[FavoriteService] User {} adding destination {} to favorites", utilisateurId, destinationId);

        // Check if already favorited
        if (favoriteRepository.existsByUtilisateur_UtilisateurIdAndDestination_DestinationId(utilisateurId, destinationId)) {
            log.warn("[FavoriteService] Destination {} already in favorites for user {}", destinationId, utilisateurId);
            return; // Silently ignore duplicate (idempotent)
        }

        Utilisateur user = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        Destination destination = destinationRepository.findById(destinationId)
                .orElseThrow(() -> new DestinationNotFoundException("Destination introuvable (#" + destinationId + ")"));

        DestinationFavorite favorite = DestinationFavorite.builder()
                .utilisateur(user)
                .destination(destination)
                .build();

        favoriteRepository.save(favorite);
        log.info("[FavoriteService] Favorite added successfully");
    }

    /**
     * Remove a destination from user's favorites
     */
    @Transactional
    public void removeFavorite(Integer utilisateurId, Integer destinationId) {
        log.info("[FavoriteService] User {} removing destination {} from favorites", utilisateurId, destinationId);

        DestinationFavorite favorite = favoriteRepository
                .findByUtilisateur_UtilisateurIdAndDestination_DestinationId(utilisateurId, destinationId)
                .orElseThrow(() -> new RuntimeException("Favori introuvable"));

        favoriteRepository.delete(favorite);
        log.info("[FavoriteService] Favorite removed successfully");
    }

    /**
     * Get all favorite destinations for a user (with full info)
     */
    @Transactional(readOnly = true)
    public List<FavoriteDestinationResponse> getUserFavorites(Integer utilisateurId) {
        log.info("[FavoriteService] Fetching favorites for user {}", utilisateurId);

        List<DestinationFavorite> favorites = favoriteRepository.findAllByUtilisateurIdOrderByDateAjoutDesc(utilisateurId);

        return favorites.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get only favorite destination IDs for a user (lightweight)
     */
    @Transactional(readOnly = true)
    public List<Integer> getUserFavoriteIds(Integer utilisateurId) {
        log.info("[FavoriteService] Fetching favorite IDs for user {}", utilisateurId);
        return favoriteRepository.findDestinationIdsByUtilisateurId(utilisateurId);
    }

    /**
     * Check if a destination is favorited by a user
     */
    @Transactional(readOnly = true)
    public boolean isFavorite(Integer utilisateurId, Integer destinationId) {
        return favoriteRepository.existsByUtilisateur_UtilisateurIdAndDestination_DestinationId(utilisateurId, destinationId);
    }

    /**
     * Map DestinationFavorite to response DTO
     */
    private FavoriteDestinationResponse mapToResponse(DestinationFavorite favorite) {
        Destination dest = favorite.getDestination();

        // Get review stats
        Long nombreAvis = avisRepository.countByDestinationIdAndStatut(dest.getDestinationId(), StatutModeration.VALIDE);
        Double noteAverage = avisRepository.averageRatingByDestinationIdAndStatut(dest.getDestinationId(), StatutModeration.VALIDE);

        // Get first photo
        String photoMain = null;
        if (dest.getPhotos() != null && !dest.getPhotos().isEmpty()) {
            photoMain = dest.getPhotos().get(0);
        }

        return FavoriteDestinationResponse.builder()
                .favoriteId(favorite.getFavoriteId())
                .dateAjout(favorite.getDateAjout())
                .destinationId(dest.getDestinationId())
                .nom(dest.getNom())
                .region(dest.getRegion())
                .categories(dest.getCategories())
                .tarifEstime(dest.getTarifEstime())
                .photoMain(photoMain)
                .latitude(dest.getLatitude())
                .longitude(dest.getLongitude())
                .nombreAvis(nombreAvis != null ? nombreAvis : 0L)
                .noteAverage(noteAverage)
                .build();
    }
}
