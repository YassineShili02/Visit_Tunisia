package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;

import java.util.List;

@Repository
public interface DestinationRepository extends JpaRepository<Destination, Integer>, JpaSpecificationExecutor<Destination> {

    // --- Filtered & Paginated queries ---

    Page<Destination> findByStatutOrderByCreatedAtDesc(StatutPublication statut, Pageable pageable);

    Page<Destination> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // --- Count queries ---

    long countByStatut(StatutPublication statut);

    // --- Duplicate detection queries ---

    @Query(value = "SELECT COUNT(d) > 0 FROM destinations d " +
            "WHERE LOWER(TRIM(d.nom->>'fr')) = LOWER(TRIM(:nomFr)) " +
            "AND LOWER(TRIM(d.region)) = LOWER(TRIM(:region))",
            nativeQuery = true)
    boolean existsByNomFrAndRegion(@Param("nomFr") String nomFr, @Param("region") String region);

    @Query("SELECT COUNT(d) > 0 FROM Destination d " +
            "WHERE ABS(d.latitude - :lat) < 0.001 " +
            "AND ABS(d.longitude - :lng) < 0.001")
    boolean existsByProximity(@Param("lat") double lat, @Param("lng") double lng);

    // --- Bulk fetch with categories (JOIN FETCH to prevent N+1) ---

    @Query("SELECT DISTINCT d FROM Destination d LEFT JOIN FETCH d.categories WHERE d.statut = :statut")
    List<Destination> findActiveWithCategories(@Param("statut") StatutPublication statut);

    @Query("SELECT DISTINCT d FROM Destination d LEFT JOIN FETCH d.categories WHERE d.destinationId IN :ids")
    List<Destination> findByIdsWithCategories(@Param("ids") List<Integer> ids);

    List<Destination> findByStatut(StatutPublication statut);

    List<Destination> findAllByDestinationIdIn(List<Integer> ids);
}
