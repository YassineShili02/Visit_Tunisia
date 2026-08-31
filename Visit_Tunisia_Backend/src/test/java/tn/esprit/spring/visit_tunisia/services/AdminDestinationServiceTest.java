package tn.esprit.spring.visit_tunisia.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.spring.visit_tunisia.DTO.admin.CountsResponseDTO;
import tn.esprit.spring.visit_tunisia.config.ScraperProperties;
import tn.esprit.spring.visit_tunisia.entities.Destination;
import tn.esprit.spring.visit_tunisia.enums.Categorie;
import tn.esprit.spring.visit_tunisia.enums.StatutPublication;
import tn.esprit.spring.visit_tunisia.enums.TypeDestination;
import tn.esprit.spring.visit_tunisia.exceptions.ValidationException;
import tn.esprit.spring.visit_tunisia.mappers.DestinationMapper;
import tn.esprit.spring.visit_tunisia.repositories.DestinationRepository;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminDestinationServiceTest {

    @Mock
    private DestinationRepository destinationRepository;

    @Mock
    private DestinationMapper destinationMapper;

    @Mock
    private ScraperProperties scraperProperties;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AdminDestinationService service;

    private Destination validDraftDestination;

    @BeforeEach
    void setUp() {
        Map<String, String> nom = new HashMap<>();
        nom.put("fr", "Musée Archéologique de Nabeul");

        Map<String, String> description = new HashMap<>();
        description.put("fr", "Le musée archéologique de Nabeul abrite une collection exceptionnelle de mosaïques.");

        validDraftDestination = Destination.builder()
                .destinationId(101)
                .nom(nom)
                .description(description)
                .type(TypeDestination.SITE_TOURISTIQUE)
                .categories(Set.of(Categorie.CULTUREL))
                .region("Nabeul")
                .latitude(36.4513)
                .longitude(10.7356)
                .statut(StatutPublication.BROUILLON)
                .build();
    }

    @Test
    @DisplayName("Validation publication — Destination valide ne doit pas lever d'exception")
    void testValidateForPublication_Valid() {
        assertDoesNotThrow(() -> service.validateForPublication(validDraftDestination));
    }

    @Test
    @DisplayName("Validation publication — Échec si Nom FR manquant")
    void testValidateForPublication_MissingNomFr() {
        validDraftDestination.setNom(new HashMap<>()); // Vide
        ValidationException exception = assertThrows(
                ValidationException.class,
                () -> service.validateForPublication(validDraftDestination)
        );
        assertTrue(exception.getMessage().contains("Nom FR manquant"));
    }

    @Test
    @DisplayName("Validation publication — Échec si Description FR < 20 caractères")
    void testValidateForPublication_ShortDescription() {
        Map<String, String> desc = new HashMap<>();
        desc.put("fr", "Trop court."); // 11 chars < 20
        validDraftDestination.setDescription(desc);

        ValidationException exception = assertThrows(
                ValidationException.class,
                () -> service.validateForPublication(validDraftDestination)
        );
        assertTrue(exception.getMessage().contains("Description FR trop courte"));
    }

    @Test
    @DisplayName("Validation publication — Échec si Coordonnées GPS manquantes")
    void testValidateForPublication_MissingGPS() {
        validDraftDestination.setLatitude(null);
        validDraftDestination.setLongitude(null);

        ValidationException exception = assertThrows(
                ValidationException.class,
                () -> service.validateForPublication(validDraftDestination)
        );
        assertTrue(exception.getMessage().contains("Coordonnées GPS manquantes"));
    }

    @Test
    @DisplayName("Validation publication — Échec si Aucune catégorie renseignée")
    void testValidateForPublication_EmptyCategories() {
        validDraftDestination.setCategories(new HashSet<>());

        ValidationException exception = assertThrows(
                ValidationException.class,
                () -> service.validateForPublication(validDraftDestination)
        );
        assertTrue(exception.getMessage().contains("Au moins 1 catégorie requise"));
    }

    @Test
    @DisplayName("updateStatut — Passage à ACTIF avec succès si destination valide")
    void testUpdateStatut_PublishSuccess() {
        when(destinationRepository.findById(101)).thenReturn(Optional.of(validDraftDestination));
        when(destinationRepository.save(any(Destination.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateStatut(101, StatutPublication.ACTIF);

        assertEquals(StatutPublication.ACTIF, validDraftDestination.getStatut());
        verify(destinationRepository, times(1)).save(validDraftDestination);
    }

    @Test
    @DisplayName("getCounts — Doit retourner les totaux par statut")
    void testGetCounts() {
        when(destinationRepository.count()).thenReturn(10L);
        when(destinationRepository.countByStatut(StatutPublication.ACTIF)).thenReturn(6L);
        when(destinationRepository.countByStatut(StatutPublication.BROUILLON)).thenReturn(3L);
        when(destinationRepository.countByStatut(StatutPublication.ARCHIVE)).thenReturn(1L);

        CountsResponseDTO counts = service.getCounts();

        assertEquals(10L, counts.getTotal());
        assertEquals(6L, counts.getActif());
        assertEquals(3L, counts.getBrouillon());
        assertEquals(1L, counts.getArchive());
    }
}
