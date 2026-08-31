package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;

import java.util.List;
import java.util.Optional;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Integer> {

    Optional<Utilisateur> findByEmail(String email);

    Optional<Utilisateur> findByProviderId(String providerId);

    boolean existsByEmail(String email);
    
    // Méthodes pour les statistiques
    long countByRole(RoleUtilisateur role);
    
    List<Utilisateur> findTop5ByOrderByUtilisateurIdDesc();
}
