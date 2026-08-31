package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.avis.AvisRequest;
import tn.esprit.spring.visit_tunisia.DTO.avis.AvisResponse;
import tn.esprit.spring.visit_tunisia.entities.Avis;

import java.util.List;

public interface IAvisMapper {
    Avis toEntity(AvisRequest request);
    AvisResponse toResponse(Avis avis);
    List<AvisResponse> toResponseList(List<Avis> avisList);
    void updateEntityFromRequest(AvisRequest request, Avis avis);
}
