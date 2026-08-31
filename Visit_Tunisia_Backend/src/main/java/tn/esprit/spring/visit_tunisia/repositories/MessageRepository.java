package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.Message;

@Repository
public interface MessageRepository extends JpaRepository<Message, Integer> {

    /**
     * Supprime tous les messages des conversations d'un utilisateur.
     *
     * <p>⚠️ À exécuter AVANT {@link ConversationRepository#deleteByUtilisateurId}
     * car la table {@code messages} a une FK NOT NULL vers {@code conversations}
     * ({@code conversation_id}), et la suppression en masse JPQL ne déclenche
     * pas le {@code cascade = ALL} configuré sur l'entité.
     */
    @Modifying
    @Query("DELETE FROM Message m WHERE m.conversation.utilisateur.utilisateurId = :utilisateurId")
    int deleteByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);
}
