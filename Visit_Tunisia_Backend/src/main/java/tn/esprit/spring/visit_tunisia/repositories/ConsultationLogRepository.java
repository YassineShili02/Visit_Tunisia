package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.ConsultationLog;
import tn.esprit.spring.visit_tunisia.enums.TypeConsultation;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ConsultationLogRepository extends JpaRepository<ConsultationLog, Integer> {

    /**
     * Compte les consultations VUE_DESTINATION pour un utilisateur — détection "assez de données".
     */
    @Query("SELECT COUNT(c) FROM ConsultationLog c WHERE c.utilisateur.utilisateurId = :userId AND c.typeConsultation = :type")
    long countByUtilisateurIdAndType(@Param("userId") Integer userId, @Param("type") TypeConsultation type);

    /**
     * Retourne les logs VUE_DESTINATION des 90 derniers jours pour un utilisateur.
     * Utilisé pour rassembler le signal "destinations vues" du moteur de recommandation.
     */
    @Query("SELECT DISTINCT c FROM ConsultationLog c " +
           "LEFT JOIN FETCH c.destination d " +
           "LEFT JOIN FETCH d.categories " +
           "WHERE c.utilisateur.utilisateurId = :userId " +
           "AND c.typeConsultation = 'VUE_DESTINATION' " +
           "AND c.destination IS NOT NULL " +
           "AND c.dateConsultation >= :since")
    List<ConsultationLog> findVueDestination90j(@Param("userId") Integer userId,
                                                @Param("since") LocalDateTime since);

    // ─── Admin Stats ──────────────────────────────────────────────────────────

    /**
     * Top 10 destinations les plus consultées (VUE_DESTINATION) sur une période.
     * Retourne Object[] { destinationId, nomFr, region, viewsCount }
     */
    @Query(value = "SELECT d.destination_id, COALESCE(d.nom->>'fr', d.nom->>'en', 'Destination'), COALESCE(d.region, 'Tunisie'), COUNT(c.log_id) AS views_count " +
                   "FROM consultation_logs c " +
                   "JOIN destinations d ON c.destination_id = d.destination_id " +
                   "WHERE c.type_consultation = 'VUE_DESTINATION' " +
                   "AND c.date_consultation >= :since " +
                   "GROUP BY d.destination_id, d.nom->>'fr', d.nom->>'en', d.region " +
                   "ORDER BY views_count DESC " +
                   "LIMIT 10",
           nativeQuery = true)
    List<Object[]> findTopDestinations(@Param("since") LocalDateTime since);

    /**
     * Top 15 termes de recherche les plus utilisés sur une période.
     * Retourne Object[] { termeRecherche, count }
     */
    @Query(value = "SELECT c.terme_recherche, COUNT(*) AS cnt " +
                   "FROM consultation_logs c " +
                   "WHERE c.type_consultation = 'RECHERCHE' " +
                   "AND c.terme_recherche IS NOT NULL " +
                   "AND TRIM(c.terme_recherche) <> '' " +
                   "AND c.date_consultation >= :since " +
                   "GROUP BY c.terme_recherche " +
                   "ORDER BY cnt DESC " +
                   "LIMIT 15",
           nativeQuery = true)
    List<Object[]> findTopSearchTerms(@Param("since") LocalDateTime since);

    /**
     * Nombre de consultations par jour sur une période.
     * Retourne Object[] { day (YYYY-MM-DD), count }
     */
    @Query(value = "SELECT TO_CHAR(date_consultation, 'YYYY-MM-DD') AS day, COUNT(*) AS cnt " +
                   "FROM consultation_logs " +
                   "WHERE date_consultation >= :since " +
                   "GROUP BY day " +
                   "ORDER BY day ASC",
           nativeQuery = true)
    List<Object[]> findDailyConsultations(@Param("since") LocalDateTime since);

    /**
     * Supprime tous les logs de consultation d'un utilisateur (utilisé lors de la
     * suppression définitive d'un compte admin).
     */
    @Modifying
    @Query("DELETE FROM ConsultationLog c WHERE c.utilisateur.utilisateurId = :utilisateurId")
    int deleteByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);
}
