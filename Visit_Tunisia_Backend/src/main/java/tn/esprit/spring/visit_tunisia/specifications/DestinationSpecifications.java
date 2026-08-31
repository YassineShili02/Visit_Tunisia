package tn.esprit.spring.visit_tunisia.specifications;

import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.enums.TypeDestination;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specifications for dynamic filtering of Destination entities.
 * Handles JSONB nom field, @ElementCollection categories, and standard columns.
 */
public class DestinationSpecifications {

    private DestinationSpecifications() {}

    /**
     * Legacy single-category overload (used by admin, etc.)
     */
    public static Specification<Destination> withFilters(
            StatutPublication statut,
            String region,
            Categorie categorie,
            String search
    ) {
        List<Categorie> cats = categorie != null ? List.of(categorie) : null;
        return withFilters(statut, region, cats, null, search, null);
    }

    /**
     * Main filter method — accepts multiple categories and types (OR logic).
     */
    public static Specification<Destination> withFilters(
            StatutPublication statut,
            String region,
            List<Categorie> categories,
            List<TypeDestination> types,
            String search,
            BigDecimal maxPrice
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Filter by statut
            if (statut != null) {
                predicates.add(cb.equal(root.get("statut"), statut));
            }

            // 2. Filter by region (case-insensitive)
            if (region != null && !region.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("region")), region.toLowerCase().trim()));
            }

            // 3. Filter by categories (OR logic: destination must have at least ONE of the selected categories)
            if (categories != null && !categories.isEmpty()) {
                // Build: EXISTS (SELECT cat FROM dest.categories cat WHERE cat IN (:categories))
                Subquery<Categorie> subquery = query.subquery(Categorie.class);
                Root<Destination> subRoot = subquery.correlate(root);
                Join<Destination, Categorie> catJoin = subRoot.joinSet("categories");
                subquery.select(catJoin).where(catJoin.in(categories));
                predicates.add(cb.exists(subquery));
            }

            // 4. Filter by types (OR logic: destination.type must be one of the selected types)
            if (types != null && !types.isEmpty()) {
                predicates.add(root.get("type").in(types));
            }

            // 5. Filter by maxPrice
            if (maxPrice != null) {
                predicates.add(cb.or(
                        cb.isNull(root.get("tarifEstime")),
                        cb.lessThanOrEqualTo(root.get("tarifEstime"), maxPrice)
                ));
            }

            // 6. Search in nom (JSONB) and region
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase().trim() + "%";
                Expression<String> nomFr = cb.function("jsonb_extract_path_text", String.class,
                        root.get("nom"), cb.literal("fr"));
                Predicate nomFrLike = cb.like(cb.lower(nomFr), pattern);
                Predicate regionLike = cb.like(cb.lower(root.get("region")), pattern);
                predicates.add(cb.or(nomFrLike, regionLike));
            }

            // Order by createdAt desc
            query.orderBy(cb.desc(root.get("createdAt")));

            // Ensure distinct results
            query.distinct(true);

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

