package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.EmailVerificationToken;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Integer> {

    /**
     * Trouve un token par son code de vérification
     */
    Optional<EmailVerificationToken> findByCode(String code);

    /**
     * Trouve tous les tokens d'un utilisateur (pour vérifier s'il y en a déjà)
     */
    Optional<EmailVerificationToken> findByUtilisateur(Utilisateur utilisateur);

    /**
     * Trouve le dernier token valide (non utilisé et non expiré) d'un utilisateur
     */
    @Query("SELECT t FROM EmailVerificationToken t WHERE t.utilisateur = :utilisateur " +
           "AND t.utilise = false AND t.dateExpiration > :now ORDER BY t.dateCreation DESC")
    Optional<EmailVerificationToken> findLatestValidTokenByUtilisateur(
            @Param("utilisateur") Utilisateur utilisateur,
            @Param("now") LocalDateTime now);

    /**
     * Supprime tous les tokens d'un utilisateur (utilisé avant de générer un nouveau token)
     */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.utilisateur = :utilisateur")
    void deleteByUtilisateur(@Param("utilisateur") Utilisateur utilisateur);

    /**
     * Supprime tous les tokens de vérification d'email d'un utilisateur par son
     * identifiant (utilisé lors de la suppression définitive d'un compte admin).
     */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.utilisateur.utilisateurId = :utilisateurId")
    int deleteByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);

    /**
     * Supprime tous les tokens expirés (tâche de nettoyage)
     */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.dateExpiration < :now")
    void deleteExpiredTokens(@Param("now") LocalDateTime now);

    /**
     * Vérifie si un code existe déjà (pour éviter les doublons lors de la génération)
     */
    boolean existsByCode(String code);
}
