package tn.esprit.spring.visit_tunisia.specifications;

import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.entities.Evenement;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specifications for dynamic filtering of Evenement entities.
 * Handles JSONB nom fields, joined destination, genre, dates, and statut.
 */
public class EvenementSpecifications {

    private EvenementSpecifications() {}

    public static Specification<Evenement> withFilters(
            StatutPublication statut,
            String genre,
            Integer destinationId,
            String search
    ) {
        return withFilters(statut, genre, destinationId, search, null, null);
    }

    public static Specification<Evenement> withFilters(
            StatutPublication statut,
            String genre,
            Integer destinationId,
            String search,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Statut de publication
            if (statut != null) {
                predicates.add(cb.equal(root.get("statut"), statut));
            }

            // 2. Genre (case-insensitive exact or partial match)
            if (genre != null && !genre.isBlank() && !"Tous".equalsIgnoreCase(genre)) {
                predicates.add(cb.equal(cb.lower(root.get("genre")), genre.toLowerCase().trim()));
            }

            // 3. Destination liée
            if (destinationId != null) {
                Join<Evenement, Destination> destJoin = root.join("destination", JoinType.INNER);
                predicates.add(cb.equal(destJoin.get("destinationId"), destinationId));
            }

            // 4. Filtre de dates (fromDate / toDate)
            if (fromDate != null) {
                Predicate dateFinGte = cb.greaterThanOrEqualTo(root.get("dateFin"), fromDate);
                Predicate dateDebutGteNoEnd = cb.and(cb.isNull(root.get("dateFin")), cb.greaterThanOrEqualTo(root.get("dateDebut"), fromDate));
                predicates.add(cb.or(dateFinGte, dateDebutGteNoEnd));
            }
            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dateDebut"), toDate));
            }

            // 5. Recherche textuelle (nom FR/EN/AR via jsonb_extract_path_text, genre, destination)
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase().trim() + "%";

                Expression<String> nomFr = cb.function("jsonb_extract_path_text", String.class,
                        root.get("nom"), cb.literal("fr"));
                Expression<String> nomEn = cb.function("jsonb_extract_path_text", String.class,
                        root.get("nom"), cb.literal("en"));
                Expression<String> nomAr = cb.function("jsonb_extract_path_text", String.class,
                        root.get("nom"), cb.literal("ar"));

                Predicate nomFrLike = cb.like(cb.lower(nomFr), pattern);
                Predicate nomEnLike = cb.like(cb.lower(nomEn), pattern);
                Predicate nomArLike = cb.like(cb.lower(nomAr), pattern);
                Predicate genreLike = cb.like(cb.lower(root.get("genre")), pattern);

                Join<Evenement, Destination> destJoin = root.join("destination", JoinType.LEFT);
                Expression<String> destNomFr = cb.function("jsonb_extract_path_text", String.class,
                        destJoin.get("nom"), cb.literal("fr"));
                Predicate destNomLike = cb.like(cb.lower(destNomFr), pattern);
                Predicate destRegionLike = cb.like(cb.lower(destJoin.get("region")), pattern);
                Predicate lieuLibreLike = cb.like(cb.lower(root.get("lieuLibre")), pattern);

                predicates.add(cb.or(nomFrLike, nomEnLike, nomArLike, genreLike, destNomLike, destRegionLike, lieuLibreLike));
            }

            // Order by dateDebut asc (closest first), evenementId asc for select queries
            if (!Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                query.orderBy(
                        cb.asc(root.get("dateDebut")),
                        cb.asc(root.get("evenementId"))
                );
            }

            query.distinct(true);

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
