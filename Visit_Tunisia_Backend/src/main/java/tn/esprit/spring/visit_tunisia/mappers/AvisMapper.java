package tn.esprit.spring.visit_tunisia.mappers;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisRequest;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisResponse;
import tn.esprit.spring.visit_tunisia.entities.Avis;

import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
public class AvisMapper implements IAvisMapper {

    @Override
    public Avis toEntity(AvisRequest request) {
        if (request == null) {
            return null;
        }
        return Avis.builder()
                .note(request.getNote())
                .commentaire(request.getCommentaire())
                // Utilisateur, Destination, Evenement entities are resolved & set by the service layer
                .build();
    }

    @Override
    public AvisResponse toResponse(Avis avis) {
        if (avis == null) {
            return null;
        }
        AvisResponse.AvisResponseBuilder builder = AvisResponse.builder()
                .avisId(avis.getAvisId())
                .note(avis.getNote())
                .commentaire(avis.getCommentaire())
                .sentimentLabel(avis.getSentimentLabel())
                .sentimentScore(avis.getSentimentScore())
                .statutModeration(avis.getStatutModeration())
                .dateCreation(avis.getDateCreation());

        if (avis.getUtilisateur() != null) {
            builder.utilisateurId(avis.getUtilisateur().getUtilisateurId());
            String nomComplet = (avis.getUtilisateur().getPrenom() != null ? avis.getUtilisateur().getPrenom() + " " : "")
                    + (avis.getUtilisateur().getNom() != null ? avis.getUtilisateur().getNom() : "");
            builder.utilisateurNom(nomComplet.trim());
        }

        if (avis.getDestination() != null) {
            builder.destinationId(avis.getDestination().getDestinationId());
        }

        if (avis.getEvenement() != null) {
            builder.evenementId(avis.getEvenement().getEvenementId());
        }

        return builder.build();
    }

    @Override
    public List<AvisResponse> toResponseList(List<Avis> avisList) {
        if (avisList == null) {
            return List.of();
        }
        return avisList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void updateEntityFromRequest(AvisRequest request, Avis avis) {
        if (request == null || avis == null) {
            return;
        }
        if (request.getNote() != null) {
            avis.setNote(request.getNote());
        }
        if (request.getCommentaire() != null) {
            avis.setCommentaire(request.getCommentaire());
        }
    }
}
