package tn.esprit.spring.visit_tunisia.services;

import tn.esprit.spring.visit_tunisia.DTO.admin.BulkRequestDTO;
import tn.esprit.spring.visit_tunisia.DTO.admin.CountsResponseDTO;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationRequest;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationResponse;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;

public interface IAdminDestinationService {

    void importDestinationsAsync(String gouvernorat, tn.esprit.spring.visit_tunisia.entities.Utilisateur adminUser);

    Map<String, Object> getImportStatus(String gouvernorat);

    Page<DestinationResponse> getDestinations(StatutPublication statut, String region, Categorie categorie, String search, Pageable pageable);

    DestinationResponse updateStatut(Integer id, StatutPublication statut);

    DestinationResponse updateDestination(Integer id, DestinationRequest request);

    void deleteDestination(Integer id);

    int bulkAction(BulkRequestDTO dto);

    CountsResponseDTO getCounts();
}
