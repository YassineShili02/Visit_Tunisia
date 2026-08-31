package tn.esprit.spring.visit_tunisia.mappers;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.journalAction.JournalActionResponse;
import tn.esprit.spring.visit_tunisia.entities.JournalAction;

import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
public class JournalActionMapper implements IJournalActionMapper {

    @Override
    public JournalActionResponse toResponse(JournalAction journalAction) {
        if (journalAction == null) {
            return null;
        }
        JournalActionResponse.JournalActionResponseBuilder builder = JournalActionResponse.builder()
                .journalId(journalAction.getJournalId())
                .typeAction(journalAction.getTypeAction())
                .entiteType(journalAction.getEntiteType())
                .details(journalAction.getDetails())
                .dateAction(journalAction.getDateAction());

        if (journalAction.getUtilisateur() != null) {
            builder.utilisateurId(journalAction.getUtilisateur().getUtilisateurId());
            String nomComplet = (journalAction.getUtilisateur().getPrenom() != null ? journalAction.getUtilisateur().getPrenom() + " " : "")
                    + (journalAction.getUtilisateur().getNom() != null ? journalAction.getUtilisateur().getNom() : "");
            builder.utilisateurNom(nomComplet.trim());
        }

        return builder.build();
    }

    @Override
    public List<JournalActionResponse> toResponseList(List<JournalAction> journalActionList) {
        if (journalActionList == null) {
            return List.of();
        }
        return journalActionList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}
