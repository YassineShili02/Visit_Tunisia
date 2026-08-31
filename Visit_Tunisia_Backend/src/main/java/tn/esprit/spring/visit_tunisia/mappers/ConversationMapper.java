package tn.esprit.spring.visit_tunisia.mappers;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.conversation.ConversationRequest;
import tn.esprit.spring.visit_tunisia.DTO.conversation.ConversationResponse;
import tn.esprit.spring.visit_tunisia.entities.Conversation;

import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
public class ConversationMapper implements IConversationMapper {

    @Override
    public Conversation toEntity(ConversationRequest request) {
        if (request == null) {
            return null;
        }
        return Conversation.builder()
                .langue(request.getLangue())
                .titre(request.getTitre())
                .build();
    }

    @Override
    public ConversationResponse toResponse(Conversation conversation) {
        if (conversation == null) {
            return null;
        }
        ConversationResponse.ConversationResponseBuilder builder = ConversationResponse.builder()
                .conversationId(conversation.getConversationId())
                .langue(conversation.getLangue())
                .titre(conversation.getTitre())
                .dateCreation(conversation.getDateCreation());

        if (conversation.getUtilisateur() != null) {
            builder.utilisateurId(conversation.getUtilisateur().getUtilisateurId());
            String nomComplet = (conversation.getUtilisateur().getPrenom() != null ? conversation.getUtilisateur().getPrenom() + " " : "")
                    + (conversation.getUtilisateur().getNom() != null ? conversation.getUtilisateur().getNom() : "");
            builder.utilisateurNom(nomComplet.trim());
        }

        return builder.build();
    }

    @Override
    public List<ConversationResponse> toResponseList(List<Conversation> conversationList) {
        if (conversationList == null) {
            return List.of();
        }
        return conversationList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void updateEntityFromRequest(ConversationRequest request, Conversation conversation) {
        if (request == null || conversation == null) {
            return;
        }
        if (request.getLangue() != null) {
            conversation.setLangue(request.getLangue());
        }
        if (request.getTitre() != null) {
            conversation.setTitre(request.getTitre());
        }
    }
}
