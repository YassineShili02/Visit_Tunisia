package tn.esprit.spring.visit_tunisia.mappers;

import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationRequest;
import tn.esprit.spring.visit_tunisia.DTO.destination.DestinationResponse;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.enums.StatutModeration;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.repositories.AvisRepository;

import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
@RequiredArgsConstructor
public class DestinationMapper implements IDestinationMapper {

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    private final AvisRepository avisRepository;

    @Override
    public Destination toEntity(DestinationRequest request) {
        if (request == null) {
            return null;
        }

        Point localisation = null;
        if (request.getLatitude() != null && request.getLongitude() != null) {
            localisation = geometryFactory.createPoint(new Coordinate(request.getLongitude(), request.getLatitude()));
        }

        StatutPublication statut = request.getStatut() != null ? request.getStatut() : StatutPublication.BROUILLON;

        return Destination.builder()
                .nom(request.getNom())
                .description(request.getDescription())
                .type(request.getType())
                .categories(request.getCategories() != null ? new HashSet<>(request.getCategories()) : new HashSet<>())
                .region(request.getRegion())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .localisation(localisation)
                .horaires(request.getHoraires())
                .attributsSpecifiques(request.getAttributsSpecifiques())
                .tarifEstime(request.getTarifEstime())
                .accessibilitePmr(request.getAccessibilitePmr())
                .photos(request.getPhotos())
                .statut(statut)
                .build();
    }

    @Override
    public DestinationResponse toResponse(Destination destination) {
        if (destination == null) {
            return null;
        }

        // Prefer direct lat/lng fields; fallback to PostGIS Point extraction
        Double latitude = destination.getLatitude();
        Double longitude = destination.getLongitude();
        if (latitude == null && longitude == null && destination.getLocalisation() != null) {
            longitude = destination.getLocalisation().getX();
            latitude = destination.getLocalisation().getY();
        }

        // Calculate review statistics (only VALIDE reviews)
        Long nombreAvis = avisRepository.countByDestinationIdAndStatut(
                destination.getDestinationId(), 
                StatutModeration.VALIDE
        );
        Double noteAverage = avisRepository.averageRatingByDestinationIdAndStatut(
                destination.getDestinationId(), 
                StatutModeration.VALIDE
        );

        return DestinationResponse.builder()
                .destinationId(destination.getDestinationId())
                .nom(destination.getNom())
                .description(destination.getDescription())
                .type(destination.getType())
                .categories(destination.getCategories())
                .region(destination.getRegion())
                .latitude(latitude)
                .longitude(longitude)
                .horaires(destination.getHoraires())
                .attributsSpecifiques(destination.getAttributsSpecifiques())
                .tarifEstime(destination.getTarifEstime())
                .accessibilitePmr(destination.getAccessibilitePmr())
                .photos(destination.getPhotos())
                .statut(destination.getStatut())
                .createdAt(destination.getCreatedAt())
                .updatedAt(destination.getUpdatedAt())
                .nombreAvis(nombreAvis != null ? nombreAvis : 0L)
                .noteAverage(noteAverage)
                .build();
    }

    @Override
    public List<DestinationResponse> toResponseList(List<Destination> destinationList) {
        if (destinationList == null) {
            return List.of();
        }
        return destinationList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void updateEntityFromRequest(DestinationRequest request, Destination destination) {
        if (request == null || destination == null) {
            return;
        }
        if (request.getNom() != null) {
            destination.setNom(request.getNom());
        }
        if (request.getDescription() != null) {
            destination.setDescription(request.getDescription());
        }
        if (request.getType() != null) {
            destination.setType(request.getType());
        }
        if (request.getCategories() != null) {
            destination.setCategories(new HashSet<>(request.getCategories()));
        }
        if (request.getRegion() != null) {
            destination.setRegion(request.getRegion());
        }
        if (request.getLatitude() != null && request.getLongitude() != null) {
            Point localisation = geometryFactory.createPoint(new Coordinate(request.getLongitude(), request.getLatitude()));
            destination.setLocalisation(localisation);
        }
        if (request.getHoraires() != null) {
            destination.setHoraires(request.getHoraires());
        }
        if (request.getAttributsSpecifiques() != null) {
            destination.setAttributsSpecifiques(request.getAttributsSpecifiques());
        }
        if (request.getTarifEstime() != null) {
            destination.setTarifEstime(request.getTarifEstime());
        }
        if (request.getAccessibilitePmr() != null) {
            destination.setAccessibilitePmr(request.getAccessibilitePmr());
        }
        if (request.getPhotos() != null) {
            destination.setPhotos(request.getPhotos());
        }
        if (request.getStatut() != null) {
            destination.setStatut(request.getStatut());
        }
    }
}
