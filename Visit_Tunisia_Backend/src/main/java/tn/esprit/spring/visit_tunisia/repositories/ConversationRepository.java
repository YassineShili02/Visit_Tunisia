package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.Conversation;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Integer> {

    /**
     * Supprime toutes les conversations d'un utilisateur.
     * Utilisé lors de la suppression définitive d'un compte (admin).
     * Les {@code Message} rattachés sont supprimés en cascade via
     * {@code cascade = CascadeType.ALL, orphanRemoval = true} côté entité.
     */
    @Modifying
    @Query("DELETE FROM Conversation c WHERE c.utilisateur.utilisateurId = :utilisateurId")
    int deleteByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);
}
