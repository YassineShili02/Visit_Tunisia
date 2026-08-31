package tn.esprit.spring.visit_tunisia.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.spring.visit_tunisia.entities.JournalAction;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.EntiteType;
import tn.esprit.spring.visit_tunisia.enums.TypeAction;
import tn.esprit.spring.visit_tunisia.repositories.JournalActionRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class JournalActionService {

    private final JournalActionRepository journalActionRepository;

    /**
     * Enregistre une action dans le journal d'activité de manière sécurisée et non-bloquante.
     * En cas d'erreur lors de l'enregistrement, l'exception est interceptée et loguée
     * pour ne jamais interrompre le traitement principal.
     */
    @Transactional
    public void enregistrer(TypeAction typeAction, EntiteType entiteType, String details, Utilisateur utilisateur) {
        if (utilisateur == null) {
            log.debug("[JOURNAL] Ignoré: aucun utilisateur authentifié pour l'action {} sur {}", typeAction, entiteType);
            return;
        }

        try {
            JournalAction journal = JournalAction.builder()
                    .typeAction(typeAction)
                    .entiteType(entiteType)
                    .details(details)
                    .utilisateur(utilisateur)
                    .dateAction(LocalDateTime.now())
                    .build();

            journalActionRepository.save(journal);
            log.info("[JOURNAL ACTION] [{}] [{}] par {} : {}", typeAction, entiteType, utilisateur.getEmail(), details);
        } catch (Exception e) {
            log.error("[JOURNAL ERROR] Échec de l'enregistrement de l'action ({}, {}, {}): {}", 
                    typeAction, entiteType, details, e.getMessage(), e);
        }
    }
}
