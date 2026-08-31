package tn.esprit.spring.visit_tunisia.mappers;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tn.esprit.spring.visit_tunisia.DTO.utilisateur.UtilisateurRequest;
import tn.esprit.spring.visit_tunisia.DTO.utilisateur.UtilisateurResponse;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;
import tn.esprit.spring.visit_tunisia.enums.StatutCompte;

import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Component
@Primary
public class UtilisateurMapper implements IUtilisateurMapper {

    @Override
    public Utilisateur toEntity(UtilisateurRequest request) {
        if (request == null) {
            return null;
        }

        return Utilisateur.builder()
                .nom(request.getNom())
                .prenom(request.getPrenom())
                .email(request.getEmail())
                .motDePasse(request.getMotDePasse())
                .telephone(request.getTelephone())
                .role(RoleUtilisateur.TOURISTE)
                .languePreferee(request.getLanguePreferee())
                .statut(StatutCompte.ACTIF)
                .preferences(request.getPreferences() != null ? new HashSet<>(request.getPreferences()) : new HashSet<>())
                .build();
    }

    @Override
    public UtilisateurResponse toResponse(Utilisateur utilisateur) {
        if (utilisateur == null) {
            return null;
        }

        return UtilisateurResponse.builder()
                .utilisateurId(utilisateur.getUtilisateurId())
                .nom(utilisateur.getNom())
                .prenom(utilisateur.getPrenom())
                .email(utilisateur.getEmail())
                .telephone(utilisateur.getTelephone())
                .role(utilisateur.getRole())
                .languePreferee(utilisateur.getLanguePreferee())
                .statut(utilisateur.getStatut())
                .preferences(utilisateur.getPreferences())
                .dateCreation(utilisateur.getDateCreation())
                .build();
    }

    @Override
    public List<UtilisateurResponse> toResponseList(List<Utilisateur> utilisateurList) {
        if (utilisateurList == null) {
            return List.of();
        }
        return utilisateurList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void updateEntityFromRequest(UtilisateurRequest request, Utilisateur utilisateur) {
        if (request == null || utilisateur == null) {
            return;
        }
        if (request.getNom() != null) {
            utilisateur.setNom(request.getNom());
        }
        if (request.getPrenom() != null) {
            utilisateur.setPrenom(request.getPrenom());
        }
        if (request.getEmail() != null) {
            utilisateur.setEmail(request.getEmail());
        }
        if (request.getMotDePasse() != null) {
            utilisateur.setMotDePasse(request.getMotDePasse());
        }
        if (request.getTelephone() != null) {
            utilisateur.setTelephone(request.getTelephone());
        }
        if (request.getLanguePreferee() != null) {
            utilisateur.setLanguePreferee(request.getLanguePreferee());
        }
        if (request.getPreferences() != null) {
            utilisateur.setPreferences(new HashSet<>(request.getPreferences()));
        }
    }
}
