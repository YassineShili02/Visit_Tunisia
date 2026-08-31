package tn.esprit.spring.visit_tunisia;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.spring.visit_tunisia.DTO.itineraire.ItineraireRequest;
import tn.esprit.spring.visit_tunisia.DTO.itineraire.ItineraireResponse;
import tn.esprit.spring.visit_tunisia.entities.Itineraire;
import tn.esprit.spring.visit_tunisia.entities.Utilisateur;
import tn.esprit.spring.visit_tunisia.enums.RoleUtilisateur;
import tn.esprit.spring.visit_tunisia.mappers.ItineraireMapper;
import tn.esprit.spring.visit_tunisia.repositories.ItineraireRepository;
import tn.esprit.spring.visit_tunisia.repositories.UtilisateurRepository;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Vérifie le round-trip de la colonne interets (titre traduisible à l'affichage) :
 * Request -> entité -> base -> entité -> Response.
 */
@SpringBootTest
@Transactional
class ItineraireInteretsRoundTripTest {

    @Autowired
    private ItineraireRepository itineraireRepository;

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired
    private ItineraireMapper itineraireMapper;

    @Test
    void interetsSurviventALaSauvegardeEtALaLecture() {
        Utilisateur user = Utilisateur.builder()
                .nom("TestInterets")
                .prenom("RoundTrip")
                .email("roundtrip.interets@" + System.currentTimeMillis() + ".test.local")
                .role(RoleUtilisateur.TOURISTE)
                .build();
        user = utilisateurRepository.save(user);

        ItineraireRequest request = ItineraireRequest.builder()
                .titre("3 Tage zwischen Küste & Kultur")
                .interets("Balnéaire,Culturel")
                .dureeJours(3)
                .budgetTotal(new BigDecimal("450.00"))
                .nombreVoyageurs(2)
                .utilisateurId(user.getUtilisateurId())
                .build();

        // Comme en production : le service associe l'utilisateur (SecurityContext) après le mapping
        Itineraire entity = itineraireMapper.toEntity(request);
        entity.setUtilisateur(user);
        Itineraire saved = itineraireRepository.save(entity);
        assertNotNull(saved.getItineraireId());

        Itineraire reloaded = itineraireRepository.findById(saved.getItineraireId()).orElseThrow();
        assertEquals("Balnéaire,Culturel", reloaded.getInterets(), "Les intérêts doivent être persistés tels quels");

        ItineraireResponse response = itineraireMapper.toResponse(reloaded);
        assertEquals("Balnéaire,Culturel", response.getInterets(), "Les intérêts doivent ressortir dans la réponse API");
        assertEquals(3, response.getDureeJours());
    }
}
