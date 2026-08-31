package tn.esprit.spring.visit_tunisia.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.spring.visit_tunisia.DTO.itineraire.ItineraireRequest;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.entities.EtapeItineraire;
import tn.esprit.spring.visit_tunisia.entities.Itineraire;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.repositories.DestinationRepository;
import tn.esprit.spring.visit_tunisia.repositories.ItineraireRepository;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;

import java.time.Duration;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ItineraireService {

    private final ItineraireRepository itineraireRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final DestinationRepository destinationRepository;

    private static final GeometryFactory GF = new GeometryFactory(new PrecisionModel(), 4326);

    /**
     * Sauvegarde un itinéraire complet avec ses étapes pour l'utilisateur connecté.
     */
    @Transactional
    public Itineraire saveItineraire(Map<String, Object> payload) {
        // Résoudre l'utilisateur authentifié
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new SecurityException("Utilisateur non authentifié");
        }
        String email = auth.getName();
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable: " + email));

        // Construire l'entité Itineraire
        Itineraire it = Itineraire.builder()
                .titre(getString(payload, "titre", "Mon itinéraire"))
                .dureeJours(getInt(payload, "dureeJours", 1))
                .budgetTotal(new java.math.BigDecimal(getString(payload, "budgetTotal", "0")))
                .nombreVoyageurs(getInt(payload, "nombreVoyageurs", 1))
                // Intérêts canoniques (ex: "Culturel,Balnéaire") -> permettent de reconstruire
                // le titre traduit à l'affichage dans la langue active de l'utilisateur
                .interets(getString(payload, "interets", null))
                .utilisateur(user)
                .build();

        // Sauvegarder l'itinéraire pour obtenir l'ID
        it = itineraireRepository.save(it);

        // Ajouter les étapes
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> etapesData = (List<Map<String, Object>>) payload.get("etapes");
        if (etapesData != null) {
            for (Map<String, Object> e : etapesData) {
                int destId = getInt(e, "destinationId", 0);
                if (destId == 0) continue;

                Destination dest = destinationRepository.findById(destId).orElse(null);
                if (dest == null) {
                    log.warn("[ItineraireService] Destination introuvable: {}", destId);
                    continue;
                }

                // Parser l'heure prévue "HH:mm"
                String heurePrevueStr = getString(e, "heurePrevue", "09:00");
                LocalTime heurePrevue;
                try {
                    heurePrevue = LocalTime.parse(heurePrevueStr);
                } catch (Exception ex) {
                    heurePrevue = LocalTime.of(9, 0);
                }

                int dureeH = getInt(e, "dureeVisite", 2);
                int transitMin = getInt(e, "tempsTrajet", 0);

                EtapeItineraire etape = EtapeItineraire.builder()
                        .jourNumero(getInt(e, "jourNumero", 1))
                        .ordre(getInt(e, "ordre", 1))
                        .heurePrevue(heurePrevue)
                        .dureeVisite(Duration.ofHours(dureeH))
                        .tempsTrajet(Duration.ofMinutes(transitMin))
                        .destination(dest)
                        .itineraire(it)
                        .build();

                it.addEtape(etape);
            }
            it = itineraireRepository.save(it);
        }

        log.info("[ItineraireService] Itinéraire #{} sauvegardé pour {}", it.getItineraireId(), email);
        return it;
    }

    /**
     * Récupère tous les itinéraires de l'utilisateur authentifié.
     */
    @Transactional(readOnly = true)
    public List<Itineraire> getMyItineraires() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new SecurityException("Utilisateur non authentifié");
        }
        String email = auth.getName();
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable: " + email));
        return itineraireRepository.findByUtilisateurIdOrderByDateCreationDesc(user.getUtilisateurId());
    }

    /**
     * Supprime un itinéraire (seulement si appartient à l'utilisateur connecté).
     */
    @Transactional
    public void deleteItineraire(Integer itineraireId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new SecurityException("Utilisateur non authentifié");
        }
        String email = auth.getName();
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable: " + email));

        Itineraire itineraire = itineraireRepository.findById(itineraireId)
                .orElseThrow(() -> new RuntimeException("Itinéraire introuvable: " + itineraireId));

        // Vérifier que l'itinéraire appartient bien à l'utilisateur
        if (!itineraire.getUtilisateur().getUtilisateurId().equals(user.getUtilisateurId())) {
            throw new SecurityException("Vous n'avez pas le droit de supprimer cet itinéraire");
        }

        itineraireRepository.delete(itineraire);
        log.info("[ItineraireService] Itinéraire #{} supprimé par {}", itineraireId, email);
    }

    // ─── Utilitaires de parsing ───────────────────────────────────────────────
    private String getString(Map<String, Object> map, String key, String defaultVal) {
        Object v = map.get(key);
        return v != null ? v.toString() : defaultVal;
    }

    private int getInt(Map<String, Object> map, String key, int defaultVal) {
        Object v = map.get(key);
        if (v == null) return defaultVal;
        try { return Integer.parseInt(v.toString()); }
        catch (NumberFormatException e) { return defaultVal; }
    }
}
