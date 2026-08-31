package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.message.MessageRequest;
import tn.esprit.spring.visit_tunisia.DTO.message.MessageResponse;
import tn.esprit.spring.visit_tunisia.entities.Message;

import java.util.List;

public interface IMessageMapper {
    Message toEntity(MessageRequest request);
    MessageResponse toResponse(Message message);
    List<MessageResponse> toResponseList(List<Message> messageList);
    void updateEntityFromRequest(MessageRequest request, Message message);
}
