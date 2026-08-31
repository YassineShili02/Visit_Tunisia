package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.JournalAction;
import tn.esprit.spring.visit_tunisia.enums.EntiteType;
import tn.esprit.spring.visit_tunisia.enums.TypeAction;

@Repository
public interface JournalActionRepository extends JpaRepository<JournalAction, Integer>, JpaSpecificationExecutor<JournalAction> {

    Page<JournalAction> findByTypeAction(TypeAction typeAction, Pageable pageable);

    Page<JournalAction> findByEntiteType(EntiteType entiteType, Pageable pageable);

    Page<JournalAction> findByTypeActionAndEntiteType(TypeAction typeAction, EntiteType entiteType, Pageable pageable);

    /**
     * Supprime toutes les entrées du journal d'actions pour un utilisateur donné
     * (utilisé lors de la suppression définitive d'un compte admin).
     * ⚠️ À appeler APRÈS avoir enregistré l'action de suppression elle-même.
     */
    @Modifying
    @Query("DELETE FROM JournalAction j WHERE j.utilisateur.utilisateurId = :utilisateurId")
    int deleteByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);
}
