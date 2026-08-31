package tn.esprit.spring.visit_tunisia.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import tn.esprit.spring.visit_tunisia.entities.ConsultationLog;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.entities.Evenement;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.TypeConsultation;
import tn.esprit.spring.visit_tunisia.repositories.ConsultationLogRepository;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;

import java.time.LocalDateTime;

/**
 * Service pour enregistrer les consultations des utilisateurs (vues destinations/événements, recherches).
 * Permet de tracker l'activité et générer des statistiques de fréquentation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConsultationLogService {

    private final ConsultationLogRepository consultationLogRepository;
    private final UtilisateurRepository utilisateurRepository;

    /**
     * Résout l'utilisateur actuellement authentifié depuis le contexte de sécurité Spring.
     * Retourne l'utilisateur ou null si pas d'authentification.
     */
    public Utilisateur resolveCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                return null;
            }
            
            String email = auth.getName();
            return utilisateurRepository.findByEmail(email).orElse(null);
        } catch (Exception e) {
            log.warn("Impossible de résoudre l'utilisateur actuel: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Enregistre une vue de destination (appelé lors de l'affichage d'une page détail destination).
     * Asynchrone pour ne pas impacter les performances de la requête.
     */
    @Async
    public void logVueDestination(Destination destination, Utilisateur utilisateur) {
        try {
            ConsultationLog log = ConsultationLog.builder()
                    .typeConsultation(TypeConsultation.VUE_DESTINATION)
                    .destination(destination)
                    .utilisateur(utilisateur)
                    .dateConsultation(LocalDateTime.now())
                    .build();
            
            consultationLogRepository.save(log);
            this.log.debug("Vue destination enregistrée: destination={}, user={}", 
                     destination.getDestinationId(), 
                     utilisateur != null ? utilisateur.getEmail() : "anonyme");
        } catch (Exception e) {
            log.error("Erreur lors de l'enregistrement de la vue destination: {}", e.getMessage(), e);
        }
    }

    /**
     * Enregistre une vue d'événement (appelé lors de l'affichage d'une page détail événement).
     * Asynchrone pour ne pas impacter les performances de la requête.
     */
    @Async
    public void logVueEvenement(Evenement evenement, Utilisateur utilisateur) {
        try {
            ConsultationLog log = ConsultationLog.builder()
                    .typeConsultation(TypeConsultation.VUE_EVENEMENT)
                    .evenement(evenement)
                    .utilisateur(utilisateur)
                    .dateConsultation(LocalDateTime.now())
                    .build();
            
            consultationLogRepository.save(log);
            this.log.debug("Vue événement enregistrée: event={}, user={}", 
                     evenement.getEvenementId(), 
                     utilisateur != null ? utilisateur.getEmail() : "anonyme");
        } catch (Exception e) {
            log.error("Erreur lors de l'enregistrement de la vue événement: {}", e.getMessage(), e);
        }
    }

    /**
     * Enregistre une recherche effectuée par l'utilisateur.
     * Asynchrone pour ne pas impacter les performances de la requête.
     */
    @Async
    public void logRecherche(String termeRecherche, Utilisateur utilisateur) {
        try {
            if (termeRecherche == null || termeRecherche.isBlank()) {
                return; // Ne pas enregistrer les recherches vides
            }
            
            ConsultationLog log = ConsultationLog.builder()
                    .typeConsultation(TypeConsultation.RECHERCHE)
                    .termeRecherche(termeRecherche.trim())
                    .utilisateur(utilisateur)
                    .dateConsultation(LocalDateTime.now())
                    .build();
            
            consultationLogRepository.save(log);
            this.log.debug("Recherche enregistrée: terme='{}', user={}", 
                     termeRecherche, 
                     utilisateur != null ? utilisateur.getEmail() : "anonyme");
        } catch (Exception e) {
            log.error("Erreur lors de l'enregistrement de la recherche: {}", e.getMessage(), e);
        }
    }
}
