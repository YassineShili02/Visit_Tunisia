package tn.esprit.spring.visit_tunisia.mappers;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.consultationLog.ConsultationLogRequest;
import tn.esprit.spring.visit_tunisia.DTO.consultationLog.ConsultationLogResponse;
import tn.esprit.spring.visit_tunisia.entities.ConsultationLog;

import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
public class ConsultationLogMapper implements IConsultationLogMapper {

    @Override
    public ConsultationLog toEntity(ConsultationLogRequest request) {
        if (request == null) {
            return null;
        }
        return ConsultationLog.builder()
                .termeRecherche(request.getTermeRecherche())
                .typeConsultation(request.getTypeConsultation())
                .build();
    }

    @Override
    public ConsultationLogResponse toResponse(ConsultationLog log) {
        if (log == null) {
            return null;
        }
        ConsultationLogResponse.ConsultationLogResponseBuilder builder = ConsultationLogResponse.builder()
                .logId(log.getLogId())
                .termeRecherche(log.getTermeRecherche())
                .dateConsultation(log.getDateConsultation())
                .typeConsultation(log.getTypeConsultation());

        if (log.getUtilisateur() != null) {
            builder.utilisateurId(log.getUtilisateur().getUtilisateurId());
        }
        if (log.getDestination() != null) {
            builder.destinationId(log.getDestination().getDestinationId());
        }
        if (log.getEvenement() != null) {
            builder.evenementId(log.getEvenement().getEvenementId());
        }

        return builder.build();
    }

    @Override
    public List<ConsultationLogResponse> toResponseList(List<ConsultationLog> logList) {
        if (logList == null) {
            return List.of();
        }
        return logList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void updateEntityFromRequest(ConsultationLogRequest request, ConsultationLog log) {
        if (request == null || log == null) {
            return;
        }
        if (request.getTermeRecherche() != null) {
            log.setTermeRecherche(request.getTermeRecherche());
        }
        if (request.getTypeConsultation() != null) {
            log.setTypeConsultation(request.getTypeConsultation());
        }
    }
}
