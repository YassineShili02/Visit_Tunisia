package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationRequest;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationResponse;
import tn.esprit.spring.visit_tunisia.entities.Destination;

import java.util.List;

public interface IDestinationMapper {
    Destination toEntity(DestinationRequest request);
    DestinationResponse toResponse(Destination destination);
    List<DestinationResponse> toResponseList(List<Destination> destinationList);
    void updateEntityFromRequest(DestinationRequest request, Destination destination);
}
