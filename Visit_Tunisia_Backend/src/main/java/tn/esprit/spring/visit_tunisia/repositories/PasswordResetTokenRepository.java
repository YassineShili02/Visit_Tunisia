package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.PasswordResetToken;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Integer> {

    Optional<PasswordResetToken> findByToken(String token);

    void deleteByUtilisateur(Utilisateur utilisateur);

    /**
     * Supprime tous les tokens de réinitialisation de mot de passe d'un utilisateur
     * par son identifiant (utilisé lors de la suppression définitive d'un compte admin).
     */
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.utilisateur.utilisateurId = :utilisateurId")
    int deleteByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);
}
