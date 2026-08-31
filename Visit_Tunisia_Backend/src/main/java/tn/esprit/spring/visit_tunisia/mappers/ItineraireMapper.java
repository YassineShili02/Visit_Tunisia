package tn.esprit.spring.visit_tunisia.mappers;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.itineraire.ItineraireRequest;
import tn.esprit.spring.visit_tunisia.DTO.itineraire.ItineraireResponse;
import tn.esprit.spring.visit_tunisia.entities.Itineraire;

import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
public class ItineraireMapper implements IItineraireMapper {

    private final IEtapeItineraireMapper etapeItineraireMapper;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    public ItineraireMapper(IEtapeItineraireMapper etapeItineraireMapper) {
        this.etapeItineraireMapper = etapeItineraireMapper;
    }

    @Override
    public Itineraire toEntity(ItineraireRequest request) {
        if (request == null) {
            return null;
        }

        Point pointDepart = null;
        if (request.getLatitudeDepart() != null && request.getLongitudeDepart() != null) {
            pointDepart = geometryFactory.createPoint(new Coordinate(request.getLongitudeDepart(), request.getLatitudeDepart()));
        }

        return Itineraire.builder()
                .titre(request.getTitre())
                .interets(request.getInterets())
                .dureeJours(request.getDureeJours())
                .budgetTotal(request.getBudgetTotal())
                .dateDebut(request.getDateDebut())
                .nombreVoyageurs(request.getNombreVoyageurs())
                .pointDepart(pointDepart)
                .build();
    }

    @Override
    public ItineraireResponse toResponse(Itineraire itineraire) {
        if (itineraire == null) {
            return null;
        }

        Double latitudeDepart = null;
        Double longitudeDepart = null;
        if (itineraire.getPointDepart() != null) {
            longitudeDepart = itineraire.getPointDepart().getX();
            latitudeDepart = itineraire.getPointDepart().getY();
        }

        ItineraireResponse.ItineraireResponseBuilder builder = ItineraireResponse.builder()
                .itineraireId(itineraire.getItineraireId())
                .titre(itineraire.getTitre())
                .interets(itineraire.getInterets())
                .dureeJours(itineraire.getDureeJours())
                .budgetTotal(itineraire.getBudgetTotal())
                .dateDebut(itineraire.getDateDebut())
                .dateCreation(itineraire.getDateCreation())
                .nombreVoyageurs(itineraire.getNombreVoyageurs())
                .latitudeDepart(latitudeDepart)
                .longitudeDepart(longitudeDepart);

        if (itineraire.getUtilisateur() != null) {
            builder.utilisateurId(itineraire.getUtilisateur().getUtilisateurId());
            String nomComplet = (itineraire.getUtilisateur().getPrenom() != null ? itineraire.getUtilisateur().getPrenom() + " " : "")
                    + (itineraire.getUtilisateur().getNom() != null ? itineraire.getUtilisateur().getNom() : "");
            builder.utilisateurNom(nomComplet.trim());
        }

        if (itineraire.getEtapes() != null && !itineraire.getEtapes().isEmpty()) {
            builder.etapes(etapeItineraireMapper.toResponseList(itineraire.getEtapes()));
        } else {
            builder.etapes(List.of());
        }

        return builder.build();
    }

    @Override
    public List<ItineraireResponse> toResponseList(List<Itineraire> itineraireList) {
        if (itineraireList == null) {
            return List.of();
        }
        return itineraireList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void updateEntityFromRequest(ItineraireRequest request, Itineraire itineraire) {
        if (request == null || itineraire == null) {
            return;
        }
        if (request.getTitre() != null) {
            itineraire.setTitre(request.getTitre());
        }
        if (request.getInterets() != null) {
            itineraire.setInterets(request.getInterets());
        }
        if (request.getDureeJours() != null) {
            itineraire.setDureeJours(request.getDureeJours());
        }
        if (request.getBudgetTotal() != null) {
            itineraire.setBudgetTotal(request.getBudgetTotal());
        }
        if (request.getDateDebut() != null) {
            itineraire.setDateDebut(request.getDateDebut());
        }
        if (request.getNombreVoyageurs() != null) {
            itineraire.setNombreVoyageurs(request.getNombreVoyageurs());
        }
        if (request.getLatitudeDepart() != null && request.getLongitudeDepart() != null) {
            Point pointDepart = geometryFactory.createPoint(new Coordinate(request.getLongitudeDepart(), request.getLatitudeDepart()));
            itineraire.setPointDepart(pointDepart);
        }
    }
}
