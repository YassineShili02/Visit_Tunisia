package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.itineraire.ItineraireRequest;
import tn.esprit.spring.visit_tunisia.DTO.itineraire.ItineraireResponse;
import tn.esprit.spring.visit_tunisia.entities.Itineraire;

import java.util.List;

public interface IItineraireMapper {
    Itineraire toEntity(ItineraireRequest request);
    ItineraireResponse toResponse(Itineraire itineraire);
    List<ItineraireResponse> toResponseList(List<Itineraire> itineraireList);
    void updateEntityFromRequest(ItineraireRequest request, Itineraire itineraire);
}
