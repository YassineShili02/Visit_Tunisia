package tn.esprit.spring.visit_tunisia.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.spring.visit_tunisia.entities.Itineraire;

import java.util.List;

@Repository
public interface ItineraireRepository extends JpaRepository<Itineraire, Integer> {

    @Query("SELECT DISTINCT i FROM Itineraire i LEFT JOIN FETCH i.etapes e LEFT JOIN FETCH e.destination d WHERE i.utilisateur.utilisateurId = :userId ORDER BY i.dateCreation DESC")
    List<Itineraire> findByUtilisateurIdOrderByDateCreationDesc(@Param("userId") Integer userId);

    /**
     * Supprime tous les itinéraires d'un utilisateur (utilisé lors de la suppression
     * définitive d'un compte admin). Les {@code EtapeItineraire} associés sont
     * supprimés en cascade via l'entité.
     */
    @Modifying
    @Query("DELETE FROM Itineraire i WHERE i.utilisateur.utilisateurId = :utilisateurId")
    int deleteByUtilisateurId(@Param("utilisateurId") Integer utilisateurId);
}
