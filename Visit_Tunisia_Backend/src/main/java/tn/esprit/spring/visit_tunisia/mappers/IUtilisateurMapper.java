package tn.esprit.spring.visit_tunisia.mappers;

import tn.esprit.spring.visit_tunisia.DTO.utilisateur.UtilisateurRequest;
import tn.esprit.spring.visit_tunisia.DTO.utilisateur.UtilisateurResponse;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;

import java.util.List;

public interface IUtilisateurMapper {
    Utilisateur toEntity(UtilisateurRequest request);
    UtilisateurResponse toResponse(Utilisateur utilisateur);
    List<UtilisateurResponse> toResponseList(List<Utilisateur> utilisateurList);
    void updateEntityFromRequest(UtilisateurRequest request, Utilisateur utilisateur);
}
