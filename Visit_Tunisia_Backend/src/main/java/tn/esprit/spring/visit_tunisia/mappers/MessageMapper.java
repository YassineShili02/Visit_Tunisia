package tn.esprit.spring.visit_tunisia.mappers;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.message.MessageRequest;
import tn.esprit.spring.visit_tunisia.DTO.message.MessageResponse;
import tn.esprit.spring.visit_tunisia.entities.Message;

import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
public class MessageMapper implements IMessageMapper {

    @Override
    public Message toEntity(MessageRequest request) {
        if (request == null) {
            return null;
        }
        return Message.builder()
                .expediteurType(request.getExpediteurType())
                .contenu(request.getContenu())
                .build();
    }

    @Override
    public MessageResponse toResponse(Message message) {
        if (message == null) {
            return null;
        }
        MessageResponse.MessageResponseBuilder builder = MessageResponse.builder()
                .messageId(message.getMessageId())
                .expediteurType(message.getExpediteurType())
                .contenu(message.getContenu())
                .dateEnvoi(message.getDateEnvoi());

        if (message.getConversation() != null) {
            builder.conversationId(message.getConversation().getConversationId());
        }

        return builder.build();
    }

    @Override
    public List<MessageResponse> toResponseList(List<Message> messageList) {
        if (messageList == null) {
            return List.of();
        }
        return messageList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void updateEntityFromRequest(MessageRequest request, Message message) {
        if (request == null || message == null) {
            return;
        }
        if (request.getExpediteurType() != null) {
            message.setExpediteurType(request.getExpediteurType());
        }
        if (request.getContenu() != null) {
            message.setContenu(request.getContenu());
        }
    }
}
