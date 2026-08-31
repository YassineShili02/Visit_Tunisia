package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.etapeItineraire.EtapeItineraireRequest;
import tn.esprit.spring.visit_tunisia.DTO.etapeItineraire.EtapeItineraireResponse;
import tn.esprit.spring.visit_tunisia.entities.EtapeItineraire;

import java.util.List;

public interface IEtapeItineraireMapper {
    EtapeItineraire toEntity(EtapeItineraireRequest request);
    EtapeItineraireResponse toResponse(EtapeItineraire etape);
    List<EtapeItineraireResponse> toResponseList(List<EtapeItineraire> etapeList);
    void updateEntityFromRequest(EtapeItineraireRequest request, EtapeItineraire etape);
}
