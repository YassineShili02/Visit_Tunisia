package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.Evenement;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EvenementRepository extends JpaRepository<Evenement, Integer>, JpaSpecificationExecutor<Evenement> {

    // Filtered & Paginated queries
    Page<Evenement> findByStatutOrderByDateDebutDesc(StatutPublication statut, Pageable pageable);

    Page<Evenement> findAllByOrderByDateDebutDesc(Pageable pageable);

    // Count queries
    long countByStatut(StatutPublication statut);

    // Bulk fetch
    List<Evenement> findAllByEvenementIdIn(List<Integer> ids);

    // Passage automatique des événements expirés en BROUILLON
    @Modifying
    @Transactional
    @Query("UPDATE Evenement e SET e.statut = :newStatut WHERE e.statut = :currentStatut AND ((e.dateFin IS NOT NULL AND e.dateFin < :today) OR (e.dateFin IS NULL AND e.dateDebut IS NOT NULL AND e.dateDebut < :today))")
    int updateExpiredEventsStatut(@Param("currentStatut") StatutPublication currentStatut,
                                  @Param("newStatut") StatutPublication newStatut,
                                  @Param("today") LocalDate today);
}
