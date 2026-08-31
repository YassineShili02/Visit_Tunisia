package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.conversation.ConversationRequest;
import tn.esprit.spring.visit_tunisia.DTO.conversation.ConversationResponse;
import tn.esprit.spring.visit_tunisia.entities.Conversation;

import java.util.List;

public interface IConversationMapper {
    Conversation toEntity(ConversationRequest request);
    ConversationResponse toResponse(Conversation conversation);
    List<ConversationResponse> toResponseList(List<Conversation> conversationList);
    void updateEntityFromRequest(ConversationRequest request, Conversation conversation);
}
