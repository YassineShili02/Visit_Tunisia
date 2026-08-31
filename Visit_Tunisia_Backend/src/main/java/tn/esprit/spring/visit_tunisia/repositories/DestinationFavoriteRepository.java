package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.DestinationFavorite;

import java.util.List;
import java.util.Optional;

@Repository
public interface DestinationFavoriteRepository extends JpaRepository<DestinationFavorite, Integer> {

    /**
     * Check if a specific user has favorited a specific destination
     */
    boolean existsByUtilisateur_UtilisateurIdAndDestination_DestinationId(Integer utilisateurId, Integer destinationId);

    /**
     * Find a favorite by user and destination (for deletion)
     */
    Optional<DestinationFavorite> findByUtilisateur_UtilisateurIdAndDestination_DestinationId(Integer utilisateurId, Integer destinationId);

    /**
     * Get all favorites for a user, ordered by most recent first
     */
    @Query("SELECT f FROM DestinationFavorite f WHERE f.utilisateur.utilisateurId = :utilisateurId ORDER BY f.dateAjout DESC")
    List<DestinationFavorite> findAllByUtilisateurIdOrderByDateAjoutDesc(@Param("utilisateurId") Integer utilisateurId);

    /**
     * Get only destination IDs favorited by a user (lightweight query)
     */
    @Query("SELECT f.destination.destinationId FROM DestinationFavorite f WHERE f.utilisateur.utilisateurId = :utilisateurId")
    List<Integer> findDestinationIdsByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);

    /**
     * Count favorites for a specific destination
     */
    long countByDestination_DestinationId(Integer destinationId);

    /**
     * Supprime tous les favoris d'un utilisateur (utilisé lors de la suppression
     * définitive d'un compte admin).
     */
    @Modifying
    @Query("DELETE FROM DestinationFavorite f WHERE f.utilisateur.utilisateurId = :utilisateurId")
    int deleteByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);
}
