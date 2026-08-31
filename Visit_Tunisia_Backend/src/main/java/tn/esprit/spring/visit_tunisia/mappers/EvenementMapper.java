package tn.esprit.spring.visit_tunisia.mappers;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementRequest;
import tn.esprit.spring.visit_tunisia.DTO.evenement.EvenementResponse;
import tn.esprit.spring.visit_tunisia.entities.Evenement;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;

import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
public class EvenementMapper implements IEvenementMapper {

    @Override
    public Evenement toEntity(EvenementRequest request) {
        if (request == null) {
            return null;
        }
        StatutPublication statut = request.getStatut() != null ? request.getStatut() : StatutPublication.BROUILLON;

        return Evenement.builder()
                .nom(request.getNom())
                .description(request.getDescription())
                .genre(request.getGenre())
                .dateDebut(request.getDateDebut())
                .dateFin(request.getDateFin())
                .statut(statut)
                .tarif(request.getTarif())
                .photos(request.getPhotos())
                .lienEvenement(request.getLienEvenement())
                .build();
    }

    @Override
    public EvenementResponse toResponse(Evenement evenement) {
        if (evenement == null) {
            return null;
        }
        EvenementResponse.EvenementResponseBuilder builder = EvenementResponse.builder()
                .evenementId(evenement.getEvenementId())
                .nom(evenement.getNom())
                .description(evenement.getDescription())
                .genre(evenement.getGenre())
                .dateDebut(evenement.getDateDebut())
                .dateFin(evenement.getDateFin())
                .statut(evenement.getStatut())
                .tarif(evenement.getTarif())
                .photos(evenement.getPhotos());

        if (evenement.getDestination() != null) {
            builder.destinationId(evenement.getDestination().getDestinationId());
            if (evenement.getDestination().getNom() != null) {
                String nom = evenement.getDestination().getNom().getOrDefault("fr",
                        evenement.getDestination().getNom().values().stream().findFirst().orElse(null));
                builder.destinationNom(nom);
            }
            builder.destinationRegion(evenement.getDestination().getRegion());
        }

        builder.lieuLibre(evenement.getLieuLibre());
        builder.lienEvenement(evenement.getLienEvenement());

        return builder.build();
    }

    @Override
    public List<EvenementResponse> toResponseList(List<Evenement> evenementList) {
        if (evenementList == null) {
            return List.of();
        }
        return evenementList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void updateEntityFromRequest(EvenementRequest request, Evenement evenement) {
        if (request == null || evenement == null) {
            return;
        }
        if (request.getNom() != null) {
            evenement.setNom(request.getNom());
        }
        if (request.getDescription() != null) {
            evenement.setDescription(request.getDescription());
        }
        if (request.getGenre() != null) {
            evenement.setGenre(request.getGenre());
        }
        if (request.getDateDebut() != null) {
            evenement.setDateDebut(request.getDateDebut());
        }
        if (request.getDateFin() != null) {
            evenement.setDateFin(request.getDateFin());
        }
        if (request.getStatut() != null) {
            evenement.setStatut(request.getStatut());
        }
        if (request.getTarif() != null) {
            evenement.setTarif(request.getTarif());
        }
        if (request.getPhotos() != null) {
            evenement.setPhotos(request.getPhotos());
        }
        // lieuLibre peut être mis à null pour effacer
        evenement.setLieuLibre(request.getLieuLibre());
        evenement.setLienEvenement(request.getLienEvenement());
    }
}
