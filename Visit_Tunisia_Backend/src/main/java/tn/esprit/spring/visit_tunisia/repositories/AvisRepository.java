package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.Avis;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutModeration;

import java.util.List;
import java.util.Optional;

@Repository
public interface AvisRepository extends JpaRepository<Avis, Integer> {

    List<Avis> findByDestinationDestinationIdOrderByDateCreationDesc(Integer destinationId);

    @Query("SELECT a FROM Avis a WHERE a.utilisateur.utilisateurId = :utilisateurId AND a.destination.destinationId = :destinationId")
    Optional<Avis> findByUtilisateurIdAndDestinationDestinationId(@Param("utilisateurId") Integer utilisateurId, @Param("destinationId") Integer destinationId);

    /**
     * Find active (non-masked) review by user and destination
     * Only returns reviews that are VALIDE or EN_ATTENTE (not MASQUE)
     */
    @Query("SELECT a FROM Avis a WHERE a.utilisateur.utilisateurId = :utilisateurId AND a.destination.destinationId = :destinationId AND a.statutModeration IN ('VALIDE', 'EN_ATTENTE')")
    Optional<Avis> findActiveByUtilisateurIdAndDestinationId(@Param("utilisateurId") Integer utilisateurId, @Param("destinationId") Integer destinationId);

    Long countByDestinationDestinationId(Integer destinationId);

    Long countByDestinationDestinationIdAndNote(Integer destinationId, Integer note);

    @Query("SELECT AVG(a.note) FROM Avis a WHERE a.destination.destinationId = :destinationId")
    Double averageRatingByDestinationId(@Param("destinationId") Integer destinationId);

    /**
     * Count the number of validated reviews for a specific destination
     */
    @Query("SELECT COUNT(a) FROM Avis a WHERE a.destination.destinationId = :destinationId AND a.statutModeration = :statut")
    Long countByDestinationIdAndStatut(@Param("destinationId") Integer destinationId, @Param("statut") StatutModeration statut);

    /**
     * Calculate the average rating for a specific destination (only validated reviews)
     */
    @Query("SELECT AVG(a.note) FROM Avis a WHERE a.destination.destinationId = :destinationId AND a.statutModeration = :statut")
    Double averageRatingByDestinationIdAndStatut(@Param("destinationId") Integer destinationId, @Param("statut") StatutModeration statut);

    /**
     * Find all reviews by user ID ordered by creation date descending
     */
    List<Avis> findByUtilisateurUtilisateurIdOrderByDateCreationDesc(Integer utilisateurId);

    // ── Recommandation Engine ────────────────────────────────────────────────

    /**
     * Compte le nombre d'avis de cet utilisateur (signal d'existence).
     */
    @Query("SELECT COUNT(a) FROM Avis a WHERE a.utilisateur.utilisateurId = :userId AND a.destination IS NOT NULL")
    long countDestinationAvisByUtilisateur(@Param("userId") Integer userId);

    /**
     * Retourne les avis positifs (note >= 4 OU sentimentLabel = POSITIF) de l'utilisateur.
     * Signal fort pour le vecteur utilisateur (poids 2).
     */
    @Query("SELECT DISTINCT a FROM Avis a " +
           "LEFT JOIN FETCH a.destination d " +
           "LEFT JOIN FETCH d.categories " +
           "WHERE a.utilisateur.utilisateurId = :userId " +
           "AND a.destination IS NOT NULL " +
           "AND (a.note >= 4 OR a.sentimentLabel = 'POSITIF')")
    List<Avis> findAppreciesByUtilisateur(@Param("userId") Integer userId);

    /**
     * Retourne les IDs de destinations pour lesquelles l'utilisateur a déjà un avis.
     * Ces destinations sont exclues de l'ensemble des candidats.
     */
    @Query("SELECT a.destination.destinationId FROM Avis a " +
           "WHERE a.utilisateur.utilisateurId = :userId AND a.destination IS NOT NULL")
    List<Integer> findDestinationIdsAvisByUtilisateur(@Param("userId") Integer userId);

    /**
     * Agrégation note moyenne + sentiment moyen par destination (pour le scoring du candidat).
     * Retourne Object[] { destinationId, avgNote, avgSentiment }
     */
    @Query("SELECT a.destination.destinationId, AVG(a.note), AVG(a.sentimentScore) " +
           "FROM Avis a " +
           "WHERE a.destination.destinationId IN :ids " +
           "AND a.statutModeration = 'VALIDE' " +
           "GROUP BY a.destination.destinationId")
    List<Object[]> findAggregatedScoresByDestinationIds(@Param("ids") List<Integer> ids);
    
    /**
     * Trouve les 5 derniers avis publiés (pour statistiques admin)
     */
    List<Avis> findTop5ByOrderByDateCreationDesc();

    /**
     * Supprime tous les avis d'un utilisateur (utilisé lors de la suppression
     * définitive d'un compte admin).
     */
    @Modifying
    @Query("DELETE FROM Avis a WHERE a.utilisateur.utilisateurId = :utilisateurId")
    int deleteByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);
}
