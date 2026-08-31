package tn.esprit.spring.visit_tunisia.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprit.spring.visit_tunisia.DTO.admin.BulkRequestDTO;
import tn.esprit.spring.visit_tunisia.DTO.admin.CountsResponseDTO;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementRequest;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementResponse;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;

public interface IAdminEvenementService {

    EvenementResponse createEvenement(EvenementRequest request);

    Page<EvenementResponse> getEvenements(StatutPublication statut, String genre, Integer destinationId, String search, Pageable pageable);

    EvenementResponse getEvenementById(Integer id);

    EvenementResponse updateEvenement(Integer id, EvenementRequest request);

    EvenementResponse updateStatut(Integer id, StatutPublication statut);

    void deleteEvenement(Integer id);

    int bulkAction(BulkRequestDTO dto);

    CountsResponseDTO getCounts();

    int archiveOrDraftExpiredEvents();
}
