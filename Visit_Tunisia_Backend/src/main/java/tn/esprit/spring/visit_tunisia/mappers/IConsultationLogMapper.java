package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.consultationLog.ConsultationLogRequest;
import tn.esprit.spring.visit_tunisia.DTO.consultationLog.ConsultationLogResponse;
import tn.esprit.spring.visit_tunisia.entities.ConsultationLog;

import java.util.List;

public interface IConsultationLogMapper {
    ConsultationLog toEntity(ConsultationLogRequest request);
    ConsultationLogResponse toResponse(ConsultationLog log);
    List<ConsultationLogResponse> toResponseList(List<ConsultationLog> logList);
    void updateEntityFromRequest(ConsultationLogRequest request, ConsultationLog log);
}
