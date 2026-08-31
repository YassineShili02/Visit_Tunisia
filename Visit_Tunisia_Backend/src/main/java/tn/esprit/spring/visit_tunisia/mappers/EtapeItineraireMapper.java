package tn.esprit.spring.visit_tunisia.mappers;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.etapeItineraire.EtapeItineraireRequest;
import tn.esprit.spring.visit_tunisia.DTO.etapeItineraire.EtapeItineraireResponse;
import tn.esprit.spring.visit_tunisia.entities.EtapeItineraire;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
public class EtapeItineraireMapper implements IEtapeItineraireMapper {

    @Override
    public EtapeItineraire toEntity(EtapeItineraireRequest request) {
        if (request == null) {
            return null;
        }
        Duration dureeVisite = request.getDureeVisiteMinutes() != null ? Duration.ofMinutes(request.getDureeVisiteMinutes()) : null;
        Duration tempsTrajet = request.getTempsTrajetMinutes() != null ? Duration.ofMinutes(request.getTempsTrajetMinutes()) : null;

        return EtapeItineraire.builder()
                .jourNumero(request.getJourNumero())
                .heurePrevue(request.getHeurePrevue())
                .ordre(request.getOrdre())
                .dureeVisite(dureeVisite)
                .tempsTrajet(tempsTrajet)
                .build();
    }

    @Override
    public EtapeItineraireResponse toResponse(EtapeItineraire etape) {
        if (etape == null) {
            return null;
        }
        Long dureeVisiteMinutes = etape.getDureeVisite() != null ? etape.getDureeVisite().toMinutes() : null;
        Long tempsTrajetMinutes = etape.getTempsTrajet() != null ? etape.getTempsTrajet().toMinutes() : null;

        EtapeItineraireResponse.EtapeItineraireResponseBuilder builder = EtapeItineraireResponse.builder()
                .etapeId(etape.getEtapeId())
                .jourNumero(etape.getJourNumero())
                .heurePrevue(etape.getHeurePrevue())
                .ordre(etape.getOrdre())
                .dureeVisiteMinutes(dureeVisiteMinutes)
                .tempsTrajetMinutes(tempsTrajetMinutes);

        if (etape.getItineraire() != null) {
            builder.itineraireId(etape.getItineraire().getItineraireId());
        }

        if (etape.getDestination() != null) {
            builder.destinationId(etape.getDestination().getDestinationId());
            if (etape.getDestination().getNom() != null) {
                // If destination nom is a Map<String, String>, extract fr or first entry
                String nom = etape.getDestination().getNom().getOrDefault("fr",
                        etape.getDestination().getNom().values().stream().findFirst().orElse(null));
                builder.destinationNom(nom);
            }
        }

        return builder.build();
    }

    @Override
    public List<EtapeItineraireResponse> toResponseList(List<EtapeItineraire> etapeList) {
        if (etapeList == null) {
            return List.of();
        }
        return etapeList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void updateEntityFromRequest(EtapeItineraireRequest request, EtapeItineraire etape) {
        if (request == null || etape == null) {
            return;
        }
        if (request.getJourNumero() != null) {
            etape.setJourNumero(request.getJourNumero());
        }
        if (request.getHeurePrevue() != null) {
            etape.setHeurePrevue(request.getHeurePrevue());
        }
        if (request.getOrdre() != null) {
            etape.setOrdre(request.getOrdre());
        }
        if (request.getDureeVisiteMinutes() != null) {
            etape.setDureeVisite(Duration.ofMinutes(request.getDureeVisiteMinutes()));
        }
        if (request.getTempsTrajetMinutes() != null) {
            etape.setTempsTrajet(Duration.ofMinutes(request.getTempsTrajetMinutes()));
        }
    }
}
