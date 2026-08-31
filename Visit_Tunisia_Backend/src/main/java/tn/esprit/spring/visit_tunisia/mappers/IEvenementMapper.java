package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementRequest;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementResponse;
import tn.esprit.spring.visit_tunisia.entities.Evenement;

import java.util.List;

public interface IEvenementMapper {
    Evenement toEntity(EvenementRequest request);
    EvenementResponse toResponse(Evenement evenement);
    List<EvenementResponse> toResponseList(List<Evenement> evenementList);
    void updateEntityFromRequest(EvenementRequest request, Evenement evenement);
}
